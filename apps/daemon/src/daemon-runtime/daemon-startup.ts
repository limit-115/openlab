import { stat } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import type { FastifyInstance } from "fastify";
import { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import { resolveDaemonConfig } from "#src/daemon-runtime/daemon-config";
import type { DaemonOptions } from "#src/daemon-runtime/daemon-config.types";
import { type DaemonDatabase, openDaemonDatabase } from "#src/daemon-runtime/daemon-database";
import { PromiseSettlementStatus } from "#src/daemon-runtime/daemon-startup.const";
import type { DaemonDependencies, RunningDaemon } from "#src/daemon-runtime/daemon-startup.types";
import { bootstrapResearch } from "#src/daemon-runtime/research-bootstrap";
import { ResearchLoopController } from "#src/daemon-runtime/research-loop-controller";
import { createStatusServer } from "#src/lab-status/status-server";
import { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { createHarnesses } from "#src/research-cycle/harness-roster";
import { runResearchLoop } from "#src/research-cycle/research-loop";
import { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

export async function startDaemon(
    options: DaemonOptions,
    dependencies: DaemonDependencies = {}
): Promise<RunningDaemon> {
    const config = resolveDaemonConfig(options);
    const database = await (dependencies.openDatabase ?? openDaemonDatabase)(config.databaseUrl);
    let app: FastifyInstance | undefined;
    let controller: ResearchLoopController | undefined;

    try {
        const workspace = await LabWorkspace.openOrCreate(
            config.workspaceRoot,
            config.taskPath,
            database.persistence
        );
        const dashboardRoot = await existingDirectory(config.dashboardRoot);
        const activity = new AgentActivityHub();
        const subscriptions = new SubscriptionAllowanceReadings();
        controller = new ResearchLoopController(
            workspace,
            activity,
            dependencies.researchLoop ?? runResearchLoop,
            createHarnesses(config.harnessKinds)
        );
        app = createStatusServer(workspace, {
            activity,
            subscriptions,
            ...(dashboardRoot === undefined ? {} : { dashboardRoot }),
            logLevel: config.logLevel,
            onStop: () =>
                controller?.cancel(new Error("External stop command")) ?? Promise.resolve()
        });
        await app.listen({ host: config.host, port: config.port });
        const address = app.server.address() as AddressInfo;
        const url = `http://${config.host}:${address.port}`;
        await bootstrapResearch(workspace);
        controller.start();
        const runningApp = app;
        const runningController = controller;
        let closing: Promise<void> | undefined;

        return {
            app: runningApp,
            workspace,
            url,
            close: () => {
                closing ??= closeDaemonResources(runningController, runningApp, database);
                return closing;
            }
        };
    } catch (error) {
        const cleanupErrors = await cleanupFailedStart(controller, app, database);
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
    controller: ResearchLoopController,
    app: FastifyInstance,
    database: DaemonDatabase
): Promise<void> {
    await controller.close(new Error("Daemon closing"));
    const results = await Promise.allSettled([app.close(), database.close()]);
    const errors = rejectedReasons(results);
    if (errors.length > 0) {
        throw new AggregateError(errors, "Failed to close daemon resources");
    }
}

async function cleanupFailedStart(
    controller: ResearchLoopController | undefined,
    app: FastifyInstance | undefined,
    database: DaemonDatabase
): Promise<unknown[]> {
    const cleanups: Promise<unknown>[] = [database.close()];
    if (app !== undefined) {
        cleanups.push(app.close());
    }
    if (controller !== undefined) {
        cleanups.push(controller.close(new Error("Daemon start failed")));
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
