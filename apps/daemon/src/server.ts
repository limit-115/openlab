import { readdir, stat } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import path from "node:path";
import FastifyStatic from "@fastify/static";
import { WakeTrigger } from "@lab/core/constants";
import { CapabilityStatus, LabState } from "@lab/protocol/constants";
import { ProvideCapabilitySchema } from "@lab/protocol/status";
import Fastify, { type FastifyInstance } from "fastify";
import { bootstrapResearch } from "#src/bootstrap";
import { DaemonLogLevel, type DaemonOptions, resolveDaemonConfig } from "#src/config";
import { type DaemonDatabase, openDaemonDatabase } from "#src/database";
import {
    type ResearchLoopOptions,
    type ResearchLoopOutcome,
    runResearchLoop
} from "#src/research-loop";
import { LabWorkspace } from "#src/workspace";

const PromiseSettlementStatus = {
    REJECTED: "rejected"
} as const;

const CapabilityResponseError = {
    INVALID_RESOURCE_REFERENCE: "Invalid capability resource reference"
} as const;

export interface RunningDaemon {
    app: FastifyInstance;
    workspace: LabWorkspace;
    url: string;
    close(): Promise<void>;
}

export interface StatusServerOptions {
    dashboardRoot?: string;
    logLevel?: (typeof DaemonLogLevel)[keyof typeof DaemonLogLevel];
    onWake?: () => void;
    onStop?: () => Promise<void>;
}

export interface DaemonDependencies {
    researchLoop?: (
        workspace: LabWorkspace,
        options: ResearchLoopOptions
    ) => Promise<ResearchLoopOutcome>;
    openDatabase?: (databaseUrl: string) => Promise<DaemonDatabase>;
}

export function createStatusServer(
    workspace: LabWorkspace,
    options: StatusServerOptions = {}
): FastifyInstance {
    const app = Fastify({
        logger: {
            level: options.logLevel ?? DaemonLogLevel.INFO
        }
    });

    if (options.dashboardRoot !== undefined) {
        void app.register(FastifyStatic, {
            root: options.dashboardRoot,
            prefix: "/"
        });
    }

    app.get("/health", async () => ({ ok: true, lab_id: workspace.labId }));
    app.get("/api/status", async () => workspace.getSnapshot());
    app.get("/api/frontier", async () => workspace.getSnapshot().frontier);
    app.get("/api/capabilities", async () => workspace.getSnapshot().capability_requests);
    app.get<{ Params: { id: string } }>("/api/inspect/:id", async (request, reply) => {
        const item = workspace.inspect(request.params.id);
        if (item === undefined) {
            return reply.code(404).send({ error: "Not found" });
        }
        return item;
    });

    app.post("/api/wake", async (_request, reply) => {
        const current = workspace.getSnapshot();
        if (current.lab.state !== LabState.HIBERNATING) {
            return reply.code(409).send({ error: `Cannot wake lab from ${current.lab.state}` });
        }
        const snapshot = await workspace.transition(LabState.RUNNING, "External wake command", {
            wakeTrigger: WakeTrigger.USER
        });
        options.onWake?.();
        return snapshot;
    });

    app.post("/api/stop", async (_request, reply) => {
        await options.onStop?.();
        const current = workspace.getSnapshot();
        if (current.lab.state !== LabState.RUNNING && current.lab.state !== LabState.HIBERNATING) {
            return reply.code(409).send({ error: `Cannot stop lab from ${current.lab.state}` });
        }
        return workspace.transition(LabState.STOPPED, "External stop command");
    });

    app.post<{ Params: { id: string } }>(
        "/api/capabilities/:id/provide",
        async (request, reply) => {
            const parsedInput = ProvideCapabilitySchema.safeParse(request.body);
            if (!parsedInput.success) {
                return reply.code(400).send({
                    error: CapabilityResponseError.INVALID_RESOURCE_REFERENCE
                });
            }
            const input = parsedInput.data;
            const capability = workspace
                .getSnapshot()
                .capability_requests.find(({ id }) => id === request.params.id);
            const wasOpen = capability?.status === CapabilityStatus.OPEN;
            const provided = await workspace.provideCapability(
                request.params.id,
                input.resource_reference
            );
            if (!provided) {
                if (capability === undefined) {
                    return reply.code(404).send({ error: "Capability request not found" });
                }
                return reply.code(409).send({ error: "Capability request is not open" });
            }
            if (wasOpen && workspace.getSnapshot().lab.state === LabState.RUNNING) {
                options.onWake?.();
            }
            return reply.code(202).send({ accepted: true });
        }
    );

    app.get("/api/export", async () => ({
        lab_id: workspace.labId,
        run_directory: workspace.runDirectory,
        files: await listRunFiles(workspace.runDirectory)
    }));

    app.get("/api/events", async (request, reply) => {
        reply.hijack();
        reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no"
        });
        reply.raw.write(`event: snapshot\ndata: ${JSON.stringify(workspace.getSnapshot())}\n\n`);

        const unsubscribe = workspace.subscribe((event, snapshot) => {
            reply.raw.write(`id: ${event.id}\nevent: event\ndata: ${JSON.stringify(event)}\n\n`);
            reply.raw.write(`event: status\ndata: ${JSON.stringify(snapshot)}\n\n`);
        });
        const heartbeat = setInterval(() => reply.raw.write(": heartbeat\n\n"), 15_000);
        request.raw.on("close", () => {
            clearInterval(heartbeat);
            unsubscribe();
        });
    });

    if (options.dashboardRoot !== undefined) {
        app.setNotFoundHandler((request, reply) => {
            if (request.method === "GET" && !request.url.startsWith("/api/")) {
                return reply.sendFile("index.html");
            }
            return reply.code(404).send({ error: "Not found" });
        });
    }

    return app;
}

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
        controller = new ResearchLoopController(
            workspace,
            dependencies.researchLoop ?? runResearchLoop
        );
        app = createStatusServer(workspace, {
            ...(dashboardRoot === undefined ? {} : { dashboardRoot }),
            logLevel: config.logLevel,
            onWake: () => controller?.start(),
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
    await controller.cancel(new Error("Daemon closing"));
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
        cleanups.push(controller.cancel(new Error("Daemon start failed")));
    }
    return rejectedReasons(await Promise.allSettled(cleanups));
}

function rejectedReasons(results: readonly PromiseSettledResult<unknown>[]): unknown[] {
    return results.flatMap((result) =>
        result.status === PromiseSettlementStatus.REJECTED ? [result.reason] : []
    );
}

class ResearchLoopController {
    readonly #workspace: LabWorkspace;
    readonly #run: (
        workspace: LabWorkspace,
        options: ResearchLoopOptions
    ) => Promise<ResearchLoopOutcome>;
    #abortController: AbortController | undefined;
    #running: Promise<ResearchLoopOutcome> | undefined;
    #restartRequested = false;

    constructor(
        workspace: LabWorkspace,
        run: (workspace: LabWorkspace, options: ResearchLoopOptions) => Promise<ResearchLoopOutcome>
    ) {
        this.#workspace = workspace;
        this.#run = run;
    }

    start(): void {
        if (this.#workspace.getSnapshot().lab.state !== LabState.RUNNING) {
            return;
        }
        if (this.#running !== undefined) {
            this.#restartRequested = true;
            return;
        }
        const abortController = new AbortController();
        this.#abortController = abortController;
        const running = this.#run(this.#workspace, { signal: abortController.signal });
        this.#running = running;
        const clear = () => {
            if (this.#running === running) {
                this.#running = undefined;
                this.#abortController = undefined;
                if (this.#restartRequested) {
                    this.#restartRequested = false;
                    this.start();
                }
            }
        };
        void running.then(clear, clear);
    }

    async cancel(reason: Error): Promise<void> {
        const running = this.#running;
        if (running === undefined) {
            return;
        }
        this.#restartRequested = false;
        this.#abortController?.abort(reason);
        try {
            await running;
        } catch {
            // A daemon shutdown or stop must still close transport and settle lifecycle state.
        }
    }
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

async function listRunFiles(runDirectory: string): Promise<string[]> {
    const entries = await readdir(runDirectory, { recursive: true, withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile())
        .map((entry) =>
            path
                .relative(runDirectory, path.join(entry.parentPath, entry.name))
                .split(path.sep)
                .join(path.posix.sep)
        )
        .sort((left, right) => left.localeCompare(right));
}
