import { readdir } from "node:fs/promises";
import path from "node:path";
import FastifyStatic from "@fastify/static";
import { assessLifecycleTransition } from "@lab/core/investigation-lifecycle/investigation-state-transitions";
import { WakeTrigger } from "@lab/core/investigation-lifecycle/wake-trigger.const";
import { AnswerCapabilitySchema } from "@lab/protocol/capabilities/answer-capability.schema";
import { InvestigationRequestSchema } from "@lab/protocol/investigation-input/investigation-input.schema";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { LabSettingsSchema } from "@lab/protocol/lab-settings/lab-settings.schema";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";
import type { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import type { HeldInvestigation } from "#src/investigation-registry/investigation-registry.types";
import { registerAgentActivityRoute } from "#src/investigation-status/agent-activity-route";
import {
    CapabilityResponseError,
    InvestigationRoute,
    LabRoute,
    RosterStreamEvent,
    STREAM_HEADERS,
    STREAM_HEARTBEAT_MS,
    StatusServerError,
    StreamEvent
} from "#src/investigation-status/status-server.const";
import type { StatusServerOptions } from "#src/investigation-status/status-server.types";
import { LAB_SETTINGS_ROUTE } from "#src/lab-settings/lab-settings.const";
import { purgeLabStorage, readLabStorage } from "#src/lab-storage/lab-storage";
import { LabStorageRoute } from "#src/lab-storage/lab-storage.const";
import {
    FRESH_READING_PARAM,
    FRESH_READING_VALUE,
    SUBSCRIPTION_ALLOWANCE_ROUTE
} from "#src/subscription-allowance/subscription-allowance.const";

interface InvestigationParams {
    id: string;
}

export function createStatusServer(
    registry: InvestigationRegistry,
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

    /**
     * The settings the lab runs on. They are written whole, because a roster and the models each
     * role runs on only mean anything together, and the answer is what is in force from that moment
     * on rather than what was sent.
     */
    if (options.settings !== undefined) {
        const settings = options.settings;
        app.get(LAB_SETTINGS_ROUTE, async () => settings.read());
        app.put(LAB_SETTINGS_ROUTE, async (request, reply) => {
            const parsedSettings = LabSettingsSchema.safeParse(request.body);
            if (!parsedSettings.success) {
                return reply.code(400).send({ error: StatusServerError.INVALID_SETTINGS });
            }
            return settings.write(parsedSettings.data);
        });
    }

    /**
     * What the lab takes up, and the one control that gives it back. A purge goes through the
     * registry rather than behind it, so every investigation's agents are stopped before its
     * history and its directory are deleted.
     */
    if (options.workspaceRoot !== undefined) {
        const workspaceRoot = options.workspaceRoot;
        app.get(LabStorageRoute.USAGE, async () => readLabStorage(workspaceRoot, registry));
        app.post(LabStorageRoute.PURGE, async () => purgeLabStorage(workspaceRoot, registry));
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

    /** Resolves the investigation an address names, or answers for the one that is not there. */
    function held(id: string, reply: FastifyReply): HeldInvestigation | undefined {
        const investigation = registry.get(id);
        if (investigation === undefined) {
            void reply.code(404).send({ error: StatusServerError.UNKNOWN_INVESTIGATION });
            return undefined;
        }
        return investigation;
    }

    app.get(LabRoute.HEALTH, async () => ({ ok: true, investigations: registry.list().length }));

    app.get(LabRoute.INVESTIGATIONS, async () => registry.list());

    app.post(LabRoute.INVESTIGATIONS, async (request, reply) => {
        const parsedInput = InvestigationRequestSchema.safeParse(request.body);
        if (!parsedInput.success) {
            return reply.code(400).send({ error: StatusServerError.INVALID_INPUT });
        }
        const investigation = await registry.create(parsedInput.data);
        return reply.code(201).send(investigation.workspace.getSnapshot());
    });

    /** The whole roster on connect, and again whenever any investigation moves. */
    app.get(LabRoute.ROSTER_EVENTS, async (request, reply) => {
        reply.hijack();
        reply.raw.writeHead(200, STREAM_HEADERS);
        writeStreamEvent(reply, RosterStreamEvent.ROSTER, registry.list());
        const unsubscribe = registry.subscribe((roster) =>
            writeStreamEvent(reply, RosterStreamEvent.ROSTER, roster)
        );
        const heartbeat = setInterval(
            () => reply.raw.write(": heartbeat\n\n"),
            STREAM_HEARTBEAT_MS
        );
        request.raw.on("close", () => {
            clearInterval(heartbeat);
            unsubscribe();
        });
    });

    app.delete<{ Params: InvestigationParams }>(InvestigationRoute.ONE, async (request, reply) =>
        (await registry.remove(request.params.id))
            ? reply.code(204).send()
            : reply.code(404).send({ error: StatusServerError.UNKNOWN_INVESTIGATION })
    );

    app.get<{ Params: InvestigationParams }>(InvestigationRoute.STATUS, async (request, reply) =>
        held(request.params.id, reply)?.workspace.getSnapshot()
    );

    app.get<{ Params: InvestigationParams }>(
        InvestigationRoute.ASSUMPTIONS,
        async (request, reply) =>
            held(request.params.id, reply)?.workspace.getSnapshot().assumptions
    );

    app.get<{ Params: InvestigationParams }>(
        InvestigationRoute.CAPABILITIES,
        async (request, reply) =>
            held(request.params.id, reply)?.workspace.getSnapshot().capability_requests
    );

    app.get<{ Params: InvestigationParams & { entityId: string } }>(
        InvestigationRoute.INSPECT,
        async (request, reply) => {
            const investigation = held(request.params.id, reply);
            if (investigation === undefined) {
                return undefined;
            }
            const item = investigation.workspace.inspect(request.params.entityId);
            if (item === undefined) {
                return reply.code(404).send({ error: StatusServerError.NOT_FOUND });
            }
            return item;
        }
    );

    /**
     * The lifecycle controls. Each asks the state machine whether the operator's transition is one
     * this investigation can make, rather than keeping a second copy of the rule here that drifts
     * from it. A refusal names the state that blocked it, which is the part an operator can act on.
     */
    app.post<{ Params: InvestigationParams }>(InvestigationRoute.WAKE, async (request, reply) => {
        const investigation = held(request.params.id, reply);
        if (investigation === undefined) {
            return undefined;
        }
        const current = investigation.workspace.getSnapshot().investigation.state;
        const wakeTrigger = WakeTrigger.USER;
        if (
            !assessLifecycleTransition(current, InvestigationState.RUNNING, { wakeTrigger }).allowed
        ) {
            return reply.code(409).send({ error: `Cannot wake investigation from ${current}` });
        }
        return investigation.workspace.transition(
            InvestigationState.RUNNING,
            "External wake command",
            { wakeTrigger }
        );
    });

    /** Pausing gives up the cycle in flight, so the agents are cancelled before it sleeps. */
    app.post<{ Params: InvestigationParams }>(InvestigationRoute.PAUSE, async (request, reply) => {
        const investigation = held(request.params.id, reply);
        if (investigation === undefined) {
            return undefined;
        }
        const current = investigation.workspace.getSnapshot().investigation.state;
        if (!assessLifecycleTransition(current, InvestigationState.HIBERNATING).allowed) {
            return reply.code(409).send({ error: `Cannot pause investigation from ${current}` });
        }
        await investigation.controller.cancel(new Error("External pause command"));
        return investigation.workspace.transition(
            InvestigationState.HIBERNATING,
            "External pause command"
        );
    });

    app.post<{ Params: InvestigationParams }>(InvestigationRoute.STOP, async (request, reply) => {
        const investigation = held(request.params.id, reply);
        if (investigation === undefined) {
            return undefined;
        }
        const current = investigation.workspace.getSnapshot().investigation.state;
        if (!assessLifecycleTransition(current, InvestigationState.STOPPED).allowed) {
            return reply.code(409).send({ error: `Cannot stop investigation from ${current}` });
        }
        await investigation.controller.cancel(new Error("External stop command"));
        return investigation.workspace.transition(
            InvestigationState.STOPPED,
            "External stop command"
        );
    });

    app.post<{ Params: InvestigationParams & { capabilityId: string } }>(
        InvestigationRoute.ANSWER_CAPABILITY,
        async (request, reply) => {
            const investigation = held(request.params.id, reply);
            if (investigation === undefined) {
                return undefined;
            }
            const parsedInput = AnswerCapabilitySchema.safeParse(request.body);
            if (!parsedInput.success) {
                return reply.code(400).send({ error: CapabilityResponseError.EMPTY_ANSWER });
            }
            const capabilityId = request.params.capabilityId;
            const capability = investigation.workspace
                .getSnapshot()
                .capability_requests.find(({ id }) => id === capabilityId);
            const answered = await investigation.workspace.answerCapability(
                capabilityId,
                parsedInput.data.answer
            );
            if (!answered) {
                if (capability === undefined) {
                    return reply.code(404).send({ error: "Capability request not found" });
                }
                return reply.code(409).send({ error: "Capability request is already answered" });
            }
            return reply.code(202).send({ accepted: true });
        }
    );

    app.get<{ Params: InvestigationParams }>(InvestigationRoute.EXPORT, async (request, reply) => {
        const investigation = held(request.params.id, reply);
        if (investigation === undefined) {
            return undefined;
        }
        return {
            investigation_id: investigation.workspace.investigationId,
            run_directory: investigation.workspace.runDirectory,
            files: await listRunFiles(investigation.workspace.runDirectory)
        };
    });

    app.get<{ Params: InvestigationParams }>(InvestigationRoute.EVENTS, async (request, reply) => {
        const investigation = registry.get(request.params.id);
        if (investigation === undefined) {
            return reply.code(404).send({ error: StatusServerError.UNKNOWN_INVESTIGATION });
        }
        reply.hijack();
        reply.raw.writeHead(200, STREAM_HEADERS);
        writeStreamEvent(reply, StreamEvent.SNAPSHOT, investigation.workspace.getSnapshot());

        const unsubscribe = investigation.workspace.subscribe((event, snapshot) => {
            reply.raw.write(`id: ${event.id}\n`);
            writeStreamEvent(reply, StreamEvent.EVENT, event);
            writeStreamEvent(reply, StreamEvent.STATUS, snapshot);
        });
        const heartbeat = setInterval(
            () => reply.raw.write(": heartbeat\n\n"),
            STREAM_HEARTBEAT_MS
        );
        request.raw.on("close", () => {
            clearInterval(heartbeat);
            unsubscribe();
        });
        return undefined;
    });

    registerAgentActivityRoute(app, registry);

    if (options.dashboardRoot !== undefined) {
        app.setNotFoundHandler((request, reply) => {
            if (request.method === "GET" && !request.url.startsWith("/api/")) {
                return reply.sendFile("index.html");
            }
            return reply.code(404).send({ error: StatusServerError.NOT_FOUND });
        });
    }

    return app;
}

function writeStreamEvent(reply: FastifyReply, event: string, payload: unknown): void {
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
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
