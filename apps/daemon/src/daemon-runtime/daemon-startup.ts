import { mkdir, stat } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { TelegramBotConversation } from "@openlab/notifier/telegram-bot-conversation";
import { NotificationChannelKind } from "@openlab/protocol/operator-notifications/notification-channel.const";
import type { FastifyInstance } from "fastify";
import { resolveDaemonConfig } from "#src/daemon-runtime/daemon-config";
import type { DaemonOptions } from "#src/daemon-runtime/daemon-config.types";
import { type DaemonDatabase, openDaemonDatabase } from "#src/daemon-runtime/daemon-database";
import { PromiseSettlementStatus } from "#src/daemon-runtime/daemon-startup.const";
import type { DaemonDependencies, RunningDaemon } from "#src/daemon-runtime/daemon-startup.types";
import { DaemonStartupStep } from "#src/daemon-runtime/daemon-startup-progress.const";
import type { DaemonStartupProgress } from "#src/daemon-runtime/daemon-startup-progress.types";
import { HarnessReadinessChecks } from "#src/harness-readiness/harness-readiness-checks";
import { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import { createStatusServer } from "#src/investigation-status/status-server";
import { LabSettingsStore } from "#src/lab-settings/lab-settings-store";
import { investigationsAnswering } from "#src/operator-answers/answering-investigations";
import { OperatorAnswers } from "#src/operator-answers/operator-answers";
import { NotificationDispatch } from "#src/operator-notifications/notification-dispatch";
import { NotificationSettingsStore } from "#src/operator-notifications/notification-settings-store";
import { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

/**
 * Brings up the lab: the database it keeps its investigations in, the registry that holds them,
 * and the one address the CLI and the dashboard both talk to. Nothing is researched until an
 * investigation is created or an interrupted one is reopened.
 */
export async function startDaemon(
    options: DaemonOptions = {},
    dependencies: DaemonDependencies = {}
): Promise<RunningDaemon> {
    const config = resolveDaemonConfig(options);
    const report = dependencies.reportStartup ?? (() => undefined);
    /** The database is created inside the lab home, so the home has to exist before it is opened. */
    await mkdir(config.workspaceRoot, { recursive: true });
    report(at(DaemonStartupStep.HOME, config.workspaceRoot));
    const database = await (dependencies.openDatabase ?? openDaemonDatabase)(config.databasePath);
    report(at(DaemonStartupStep.DATABASE, config.databasePath));
    let app: FastifyInstance | undefined;
    let registry: InvestigationRegistry | undefined;

    try {
        const dashboardRoot = await existingDirectory(config.dashboardRoot);
        report(
            dashboardRoot === undefined
                ? at(DaemonStartupStep.DASHBOARD_MISSING, config.dashboardRoot)
                : at(DaemonStartupStep.DASHBOARD, dashboardRoot)
        );
        const subscriptions = new SubscriptionAllowanceReadings();
        const harnesses = new HarnessReadinessChecks();
        const settings = new LabSettingsStore(database.settings);
        const notificationSettings = new NotificationSettingsStore(database.notifications);
        await Promise.all([settings.load(), notificationSettings.load()]);
        /**
         * Every message carries a link back into the lab and the lab does not know which port it is
         * on until it is listening, so its address is read at the moment a message is written.
         */
        let labUrl = `http://${config.host}:${config.port}`;
        /**
         * The lab both reports to the operator and is answered by them, so the two are wired to
         * each other: what goes out remembers the message it went out in, and what comes back is
         * recognised by it. Neither exists until the registry does, so the answers are built first
         * and given the investigations once there are any.
         */
        let answers: OperatorAnswers | undefined;
        const dispatch = new NotificationDispatch({
            settings: notificationSettings,
            labUrl: () => labUrl,
            onFailure: (error) => app?.log.error({ err: error }, "Failed to notify the operator"),
            onAsked: (asked) => answers?.remember(asked),
            ...(dependencies.openNotificationChannel === undefined
                ? {}
                : { open: dependencies.openNotificationChannel })
        });
        registry = new InvestigationRegistry({
            workspaceRoot: config.workspaceRoot,
            persistence: database.persistence,
            investigations: database.investigations,
            subscriptions,
            settings,
            ...(dependencies.researchLoop === undefined
                ? {}
                : { researchLoop: dependencies.researchLoop })
        });
        app = createStatusServer(registry, {
            subscriptions,
            harnesses,
            settings,
            notifications: { settings: notificationSettings, dispatch },
            workspaceRoot: config.workspaceRoot,
            ...(dependencies.release === undefined ? {} : { release: dependencies.release }),
            ...(dashboardRoot === undefined ? {} : { dashboardRoot }),
            logLevel: config.logLevel
        });
        await app.listen({ host: config.host, port: config.port });
        const address = app.server.address() as AddressInfo;
        const url = `http://${config.host}:${address.port}`;
        labUrl = url;
        /**
         * Reporting is wired before the interrupted investigations are reopened, so an operator is
         * told about a run that fails the moment the lab picks it back up.
         */
        registry.subscribeToEvents((event, snapshot) => dispatch.record(event, snapshot));
        /**
         * The lab starts listening before it reopens anything, so a run that asks for something the
         * moment it is picked back up can be answered where the operator reads about it.
         */
        answers = new OperatorAnswers({
            settings: notificationSettings,
            investigations: investigationsAnswering(registry),
            say: (write) => dispatch.tell(NotificationChannelKind.TELEGRAM, write),
            openConversation: (chat, listeningSince) =>
                new TelegramBotConversation({ ...chat, listeningSince }),
            onFailure: (error) =>
                app?.log.error({ err: error }, "Failed to read the operator chat"),
            ...(dependencies.openOperatorConversation === undefined
                ? {}
                : { openConversation: dependencies.openOperatorConversation })
        });
        answers.start();
        await registry.restore();
        report(at(DaemonStartupStep.INVESTIGATIONS, String(registry.list().length)));
        const runningApp = app;
        const runningRegistry = registry;
        const listening = answers;
        let closing: Promise<void> | undefined;

        return {
            app: runningApp,
            registry: runningRegistry,
            url,
            close: () => {
                closing ??= closeDaemonResources(listening, runningRegistry, runningApp, database);
                return closing;
            }
        };
    } catch (error) {
        const cleanupErrors = await cleanupFailedStart(registry, app, database);
        if (cleanupErrors.length > 0) {
            throw new AggregateError(
                [error, ...cleanupErrors],
                "Failed to start daemon and clean up its resources"
            );
        }
        throw error;
    }
}

function at(step: DaemonStartupStep, detail: string): DaemonStartupProgress {
    return { step, detail };
}

async function closeDaemonResources(
    answers: OperatorAnswers,
    registry: InvestigationRegistry,
    app: FastifyInstance,
    database: DaemonDatabase
): Promise<void> {
    await answers.close();
    await registry.close();
    const results = await Promise.allSettled([app.close(), database.close()]);
    const errors = rejectedReasons(results);
    if (errors.length > 0) {
        throw new AggregateError(errors, "Failed to close daemon resources");
    }
}

async function cleanupFailedStart(
    registry: InvestigationRegistry | undefined,
    app: FastifyInstance | undefined,
    database: DaemonDatabase
): Promise<unknown[]> {
    const cleanups: Promise<unknown>[] = [database.close()];
    if (app !== undefined) {
        cleanups.push(app.close());
    }
    if (registry !== undefined) {
        cleanups.push(registry.close());
    }
    return rejectedReasons(await Promise.allSettled(cleanups));
}

function rejectedReasons(results: readonly PromiseSettledResult<unknown>[]): unknown[] {
    return results.flatMap((result) =>
        result.status === PromiseSettlementStatus.REJECTED ? [result.reason] : []
    );
}

async function existingDirectory(candidate: string): Promise<string | undefined> {
    try {
        return (await stat(candidate)).isDirectory() ? candidate : undefined;
    } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            return undefined;
        }
        throw error;
    }
}
