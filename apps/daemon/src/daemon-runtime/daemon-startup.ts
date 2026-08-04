import { stat } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import type { FastifyInstance } from "fastify";
import { resolveDaemonConfig } from "#src/daemon-runtime/daemon-config";
import type { DaemonOptions } from "#src/daemon-runtime/daemon-config.types";
import { type DaemonDatabase, openDaemonDatabase } from "#src/daemon-runtime/daemon-database";
import { PromiseSettlementStatus } from "#src/daemon-runtime/daemon-startup.const";
import type { DaemonDependencies, RunningDaemon } from "#src/daemon-runtime/daemon-startup.types";
import { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import { createStatusServer } from "#src/investigation-status/status-server";
import { LabSettingsStore } from "#src/lab-settings/lab-settings-store";
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
    const database = await (dependencies.openDatabase ?? openDaemonDatabase)(config.databaseUrl);
    let app: FastifyInstance | undefined;
    let registry: InvestigationRegistry | undefined;

    try {
        const dashboardRoot = await existingDirectory(config.dashboardRoot);
        const subscriptions = new SubscriptionAllowanceReadings();
        const settings = new LabSettingsStore(database.settings);
        await settings.load();
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
            settings,
            ...(dashboardRoot === undefined ? {} : { dashboardRoot }),
            logLevel: config.logLevel
        });
        await app.listen({ host: config.host, port: config.port });
        const address = app.server.address() as AddressInfo;
        const url = `http://${config.host}:${address.port}`;
        await registry.restore();
        const runningApp = app;
        const runningRegistry = registry;
        let closing: Promise<void> | undefined;

        return {
            app: runningApp,
            registry: runningRegistry,
            url,
            close: () => {
                closing ??= closeDaemonResources(runningRegistry, runningApp, database);
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

async function closeDaemonResources(
    registry: InvestigationRegistry,
    app: FastifyInstance,
    database: DaemonDatabase
): Promise<void> {
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
