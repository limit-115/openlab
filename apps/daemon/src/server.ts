import { stat } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import FastifyStatic from "@fastify/static";
import { ProvideCapabilitySchema } from "@lab/protocol/status";
import Fastify, { type FastifyInstance } from "fastify";
import { bootstrapResearch } from "#src/bootstrap";
import { type DaemonOptions, resolveDaemonConfig } from "#src/config";
import { LabWorkspace } from "#src/workspace";

export interface RunningDaemon {
    app: FastifyInstance;
    workspace: LabWorkspace;
    url: string;
    close(): Promise<void>;
}

export interface StatusServerOptions {
    dashboardRoot?: string;
}

export function createStatusServer(
    workspace: LabWorkspace,
    options: StatusServerOptions = {}
): FastifyInstance {
    const app = Fastify({
        logger: {
            level: process.env.LAB_LOG_LEVEL ?? "info"
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
        if (current.lab.state !== "HIBERNATING") {
            return reply.code(409).send({ error: `Cannot wake lab from ${current.lab.state}` });
        }
        return workspace.transition("RUNNING", "External wake command");
    });

    app.post("/api/stop", async () => workspace.transition("STOPPED", "External stop command"));

    app.post<{ Params: { id: string } }>(
        "/api/capabilities/:id/provide",
        async (request, reply) => {
            const input = ProvideCapabilitySchema.parse(request.body);
            const provided = await workspace.provideCapability(
                request.params.id,
                input.resource_reference
            );
            if (!provided) {
                return reply.code(404).send({ error: "Capability request not found" });
            }
            return reply.code(202).send({ accepted: true });
        }
    );

    app.get("/api/export", async () => ({
        lab_id: workspace.labId,
        run_directory: workspace.runDirectory,
        files: ["task.json", "events.json", "claims.json", "experiments.json", "status.json"]
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

export async function startDaemon(options: DaemonOptions): Promise<RunningDaemon> {
    const config = resolveDaemonConfig(options);
    const workspace = await LabWorkspace.openOrCreate(config.workspaceRoot, config.taskPath);
    const dashboardRoot = await existingDirectory(config.dashboardRoot);
    const app = createStatusServer(workspace, {
        ...(dashboardRoot === undefined ? {} : { dashboardRoot })
    });
    await app.listen({ host: config.host, port: config.port });
    const address = app.server.address() as AddressInfo;
    const url = `http://${config.host}:${address.port}`;
    await bootstrapResearch(workspace);

    return {
        app,
        workspace,
        url,
        close: () => app.close()
    };
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
