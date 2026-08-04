import { readdir } from "node:fs/promises";
import path from "node:path";
import FastifyStatic from "@fastify/static";
import { assessLifecycleTransition } from "@lab/core/investigation-lifecycle/investigation-state-transitions";
import { WakeTrigger } from "@lab/core/investigation-lifecycle/wake-trigger.const";
import { AnswerCapabilitySchema } from "@lab/protocol/capabilities/answer-capability.schema";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import Fastify, { type FastifyInstance } from "fastify";
import { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";
import { registerAgentActivityRoute } from "#src/investigation-status/agent-activity-route";
import { CapabilityResponseError } from "#src/investigation-status/status-server.const";
import type { StatusServerOptions } from "#src/investigation-status/status-server.types";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import {
    FRESH_READING_PARAM,
    FRESH_READING_VALUE,
    SUBSCRIPTION_ALLOWANCE_ROUTE
} from "#src/subscription-allowance/subscription-allowance.const";

export function createStatusServer(
    workspace: InvestigationWorkspace,
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

    if (options.activity !== undefined) {
        registerAgentActivityRoute(app, options.activity);
    }

    if (options.subscriptions !== undefined) {
        const subscriptions = options.subscriptions;
        app.get<{ Querystring: Record<string, string> }>(
            SUBSCRIPTION_ALLOWANCE_ROUTE,
            async (request) =>
                request.query[FRESH_READING_PARAM] === FRESH_READING_VALUE
                    ? subscriptions.refreshAll()
                    : subscriptions.readAll()
        );
    }

    app.get("/health", async () => ({ ok: true, investigation_id: workspace.investigationId }));
    app.get("/api/status", async () => workspace.getSnapshot());
    app.get("/api/assumptions", async () => workspace.getSnapshot().assumptions);
    app.get("/api/capabilities", async () => workspace.getSnapshot().capability_requests);
    app.get<{ Params: { id: string } }>("/api/inspect/:id", async (request, reply) => {
        const item = workspace.inspect(request.params.id);
        if (item === undefined) {
            return reply.code(404).send({ error: "Not found" });
        }
        return item;
    });

    /**
     * The lifecycle controls. Each asks the state machine whether the operator's transition is one
     * this run can make, rather than keeping a second copy of the rule here that drifts from it.
     * A refusal names the state that blocked it, which is the part the operator can act on.
     */
    app.post("/api/wake", async (_request, reply) => {
        const current = workspace.getSnapshot().investigation.state;
        const wakeTrigger = WakeTrigger.USER;
        if (
            !assessLifecycleTransition(current, InvestigationState.RUNNING, { wakeTrigger }).allowed
        ) {
            return reply.code(409).send({ error: `Cannot wake investigation from ${current}` });
        }
        return workspace.transition(InvestigationState.RUNNING, "External wake command", {
            wakeTrigger
        });
    });

    /** Pausing gives up the cycle in flight, so the agents are cancelled before the investigation sleeps. */
    app.post("/api/pause", async (_request, reply) => {
        const current = workspace.getSnapshot().investigation.state;
        if (!assessLifecycleTransition(current, InvestigationState.HIBERNATING).allowed) {
            return reply.code(409).send({ error: `Cannot pause investigation from ${current}` });
        }
        await options.onPause?.();
        return workspace.transition(InvestigationState.HIBERNATING, "External pause command");
    });

    app.post("/api/stop", async (_request, reply) => {
        const current = workspace.getSnapshot().investigation.state;
        if (!assessLifecycleTransition(current, InvestigationState.STOPPED).allowed) {
            return reply.code(409).send({ error: `Cannot stop investigation from ${current}` });
        }
        await options.onStop?.();
        return workspace.transition(InvestigationState.STOPPED, "External stop command");
    });

    app.post<{ Params: { id: string } }>("/api/capabilities/:id/answer", async (request, reply) => {
        const parsedInput = AnswerCapabilitySchema.safeParse(request.body);
        if (!parsedInput.success) {
            return reply.code(400).send({
                error: CapabilityResponseError.EMPTY_ANSWER
            });
        }
        const input = parsedInput.data;
        const capability = workspace
            .getSnapshot()
            .capability_requests.find(({ id }) => id === request.params.id);
        const answered = await workspace.answerCapability(request.params.id, input.answer);
        if (!answered) {
            if (capability === undefined) {
                return reply.code(404).send({ error: "Capability request not found" });
            }
            return reply.code(409).send({ error: "Capability request is already answered" });
        }
        return reply.code(202).send({ accepted: true });
    });

    app.get("/api/export", async () => ({
        investigation_id: workspace.investigationId,
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
