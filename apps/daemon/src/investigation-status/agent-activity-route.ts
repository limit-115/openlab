import type { ServerResponse } from "node:http";
import { AgentActivityStreamEvent } from "@lab/protocol/agent-activity/agent-activity.const";
import type { AgentActivity } from "@lab/protocol/agent-activity/agent-activity.types";
import type { AgentActivityFrame } from "@lab/protocol/agent-activity/agent-activity-frame.types";
import type { FastifyInstance } from "fastify";
import { replayAgentActivity } from "#src/agent-activity/agent-activity-replay";
import type { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import {
    ACTIVITY_HEARTBEAT_MS,
    ACTIVITY_STREAM_HEADERS,
    AGENT_ACTIVITY_ROUTE
} from "#src/investigation-status/agent-activity-route.const";
import { StatusServerError } from "#src/investigation-status/status-server.const";

/**
 * Streams what every agent is doing, to whoever is watching.
 *
 * A viewer is subscribed before its history is read, and the frames arriving meanwhile are held back
 * and released afterwards by sequence. That ordering is what makes the join exact: the harness writes
 * each event to disk before yielding it, so a frame is either already in the history that was read or
 * still waiting in the buffer, and never both nor neither.
 *
 * It is a route of its own rather than another name on the investigation event stream, because this one is only
 * worth paying for while somebody is looking at it, and it must never put weight on the stream the
 * rest of the dashboard depends on.
 */
export function registerAgentActivityRoute(
    app: FastifyInstance,
    registry: InvestigationRegistry
): void {
    app.get<{ Params: { id: string } }>(AGENT_ACTIVITY_ROUTE, async (request, reply) => {
        const investigation = registry.get(request.params.id);
        if (investigation === undefined) {
            return reply.code(404).send({ error: StatusServerError.UNKNOWN_INVESTIGATION });
        }
        const activity = investigation.activity;
        reply.hijack();
        const stream = new ActivityStream(reply.raw);
        const buffered: AgentActivityFrame[] = [];
        let buffering = true;

        const unsubscribe = activity.subscribe((frame) => {
            if (buffering) {
                buffered.push(frame);
                return;
            }
            stream.send(AgentActivityStreamEvent.ACTIVITY, frame);
        });
        const heartbeat = setInterval(() => stream.beat(), ACTIVITY_HEARTBEAT_MS);
        request.raw.on("close", () => {
            clearInterval(heartbeat);
            unsubscribe();
            stream.close();
        });

        const roster = activity.roster();
        stream.send(AgentActivityStreamEvent.ROSTER, roster);
        const replayed = await replayHistory(stream, roster);
        /** Anything the buffer collected during the replay, minus what the replay already covered. */
        for (const frame of buffered) {
            if (frame.sequence > (replayed.get(frame.run_id) ?? 0)) {
                stream.send(AgentActivityStreamEvent.ACTIVITY, frame);
            }
        }
        buffering = false;
    });
}

/** How far each run's history reached, so the frames held during the read resume from there. */
async function replayHistory(
    stream: ActivityStream,
    roster: readonly AgentActivity[]
): Promise<Map<string, number>> {
    const replayed = new Map<string, number>();
    for (const run of roster) {
        for await (const frame of replayAgentActivity(run)) {
            if (stream.closed) {
                return replayed;
            }
            replayed.set(frame.run_id, frame.sequence);
            await stream.send(AgentActivityStreamEvent.ACTIVITY, frame);
        }
    }
    return replayed;
}

/**
 * Writes server-sent events in the order they were handed over. Replaying a long run can outrun the
 * socket, and a send that has to wait for the buffer to drain must not let the next one overtake it.
 */
class ActivityStream {
    #closed = false;
    #queue: Promise<void> = Promise.resolve();
    readonly #response: ServerResponse;

    constructor(response: ServerResponse) {
        this.#response = response;
        response.writeHead(200, ACTIVITY_STREAM_HEADERS);
    }

    get closed(): boolean {
        return this.#closed || this.#response.writableEnded;
    }

    send(event: AgentActivityStreamEvent, payload: unknown): Promise<void> {
        return this.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    }

    beat(): void {
        void this.write(": heartbeat\n\n");
    }

    close(): void {
        this.#closed = true;
    }

    private write(chunk: string): Promise<void> {
        this.#queue = this.#queue
            .then(async () => {
                if (this.closed) {
                    return;
                }
                if (!this.#response.write(chunk)) {
                    await this.drain();
                }
            })
            /** A socket that can no longer be written to is a viewer that has gone, not a fault. */
            .catch(() => {
                this.#closed = true;
            });
        return this.#queue;
    }

    /** Resolves on drain, or on the socket closing, so a lost viewer never leaves a send waiting. */
    private drain(): Promise<void> {
        return new Promise((resolve) => {
            const settle = () => {
                this.#response.off("drain", settle);
                this.#response.off("close", settle);
                resolve();
            };
            this.#response.on("drain", settle);
            this.#response.on("close", settle);
        });
    }
}
