import { readdir } from "node:fs/promises";
import path from "node:path";
import FastifyStatic from "@fastify/static";
import { assessLifecycleTransition } from "@openlab/core/investigation-lifecycle/investigation-state-transitions";
import { WakeTrigger } from "@openlab/core/investigation-lifecycle/wake-trigger.const";
import { AnswerCapabilitySchema } from "@openlab/protocol/capabilities/answer-capability.schema";
import { InvestigationDispatchSchema } from "@openlab/protocol/investigation-input/investigation-dispatch.schema";
import type { InvestigationDispatch } from "@openlab/protocol/investigation-input/investigation-dispatch.types";
import { InvestigationRequestSchema } from "@openlab/protocol/investigation-input/investigation-input.schema";
import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import { LabSettingsSchema } from "@openlab/protocol/lab-settings/lab-settings.schema";
import { withoutChannelSecrets } from "@openlab/protocol/operator-notifications/notification-channel-secrets";
import { NotificationSettingsUpdateSchema } from "@openlab/protocol/operator-notifications/notification-settings.schema";
import { NotificationTestRequestSchema } from "@openlab/protocol/operator-notifications/notification-test.schema";
import { isSpendCapLoosened } from "@openlab/protocol/spend-caps/spend-cap";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";
import { HARNESS_READINESS_ROUTE } from "#src/harness-readiness/harness-readiness.const";
import type { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import type { HeldInvestigation } from "#src/investigation-registry/investigation-registry.types";
import { registerAgentActivityRoute } from "#src/investigation-status/agent-activity-route";
import {
    CapabilityResponseError,
    DISPATCH_CHANGED_REASON,
    InvestigationRoute,
    LabRoute,
    RosterStreamEvent,
    SPEND_CAPS_RAISED_REASON,
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
    NotificationRequestError,
    NotificationRoute
} from "#src/operator-notifications/operator-notifications.const";
import { RELEASE_NOTICE_ROUTE } from "#src/release-notice/release-notice.const";
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
     * Whether a release the operator does not have is out. The lab repeats what it was told rather
     * than asking the channel itself: what is installed and where it came from is the program's
     * business, and a lab run from its sources has no installation to be behind.
     */
    if (options.release !== undefined) {
        const release = options.release;
        app.get(RELEASE_NOTICE_ROUTE, async () => ({
            running_version: release.runningVersion,
            newer: release.newer() ?? null
        }));
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
            const held = settings.read().spend_caps;
            const stored = await settings.write(parsedSettings.data);
            /**
             * Raising a cap is the operator answering the wait of everything the old one parked, so
             * those investigations go back to work now rather than at the reset they were holding
             * out for. Every other settings change is read by the next dispatch anyway.
             */
            if (isSpendCapLoosened(held, stored.spend_caps)) {
                await registry.wakeInvestigationsWaitingOnSubscriptions(SPEND_CAPS_RAISED_REASON);
            }
            return stored;
        });
    }

    /**
     * Who the lab reports to. The document is served without the credential any channel
     * authenticates with, and taken back the same way: a page that was never shown a secret says
     * nothing about it, and the store reads that silence as "keep the one you have".
     */
    if (options.notifications !== undefined) {
        const { settings: notificationSettings, dispatch } = options.notifications;

        app.get(NotificationRoute.SETTINGS, async () =>
            withoutChannelSecrets(notificationSettings.read())
        );

        app.put(NotificationRoute.SETTINGS, async (request, reply) => {
            const parsed = NotificationSettingsUpdateSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.code(400).send({ error: NotificationRequestError.INVALID_SETTINGS });
            }
            return withoutChannelSecrets(await notificationSettings.write(parsed.data));
        });

        /** Sends through what the lab has stored, so a pass means the lab can reach the operator. */
        app.post(NotificationRoute.TEST, async (request, reply) => {
            const parsed = NotificationTestRequestSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.code(400).send({ error: NotificationRequestError.INVALID_TEST });
            }
            const result = await dispatch.test(parsed.data.kind);
            return result === undefined
                ? reply.code(404).send({ error: StatusServerError.UNCONFIGURED_CHANNEL })
                : result;
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

    /**
     * Whether the CLIs this lab researches through can run, asked of the CLIs themselves rather than
     * of anything the lab has stored. It is the one reading that has to be taken at the moment it is
     * requested: an operator asks for it while installing, and the answer they want is the one that
     * has changed.
     */
    if (options.harnesses !== undefined) {
        const harnesses = options.harnesses;
        app.get(HARNESS_READINESS_ROUTE, async () => harnesses.checkAll());
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
     * What one investigation dispatches to. Reading it is how the operator sees which subscriptions
     * a stopped run may still reach; writing it is one of the two ways past a lab held at its caps,
     * the other being to lift the caps off this investigation, which is written here as well.
     */
    app.get<{ Params: InvestigationParams }>(InvestigationRoute.DISPATCH, async (request, reply) =>
        investigationDispatch(held(request.params.id, reply))
    );

    app.put<{ Params: InvestigationParams }>(
        InvestigationRoute.DISPATCH,
        async (request, reply) => {
            const investigation = held(request.params.id, reply);
            if (investigation === undefined) {
                return undefined;
            }
            const parsedDispatch = InvestigationDispatchSchema.safeParse(request.body);
            if (!parsedDispatch.success) {
                return reply.code(400).send({ error: StatusServerError.INVALID_DISPATCH });
            }
            await investigation.workspace.changeDispatch(parsedDispatch.data);
            await investigation.controller.redispatch(new Error(DISPATCH_CHANGED_REASON));
            return investigationDispatch(investigation);
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

function investigationDispatch(
    investigation: HeldInvestigation | undefined
): InvestigationDispatch | undefined {
    if (investigation === undefined) {
        return undefined;
    }
    const input = investigation.workspace.input;
    return { harness_kinds: input.harness_kinds, spend_past_caps: input.spend_past_caps };
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
