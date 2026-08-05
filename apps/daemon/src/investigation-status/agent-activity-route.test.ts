import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { HarnessEventTypes, HarnessToolPhases } from "@nightlab/harness/harness-event.const";
import { HarnessArtifactFiles } from "@nightlab/harness/harness-run-artifacts.const";
import { AgentActivityStreamEvent } from "@nightlab/protocol/agent-activity/agent-activity.const";
import { AgentActivityFrameKind } from "@nightlab/protocol/agent-activity/agent-activity-frame.const";
import { InvestigationInputSchema } from "@nightlab/protocol/investigation-input/investigation-input.schema";
import type { FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";
import {
    activityIdentity,
    harnessEvents,
    harnessRunResult
} from "#src/agent-activity/agent-activity.fixture";
import type { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { AgentActivityRun } from "#src/agent-activity/agent-activity-hub.types";
import { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import type { HeldInvestigation } from "#src/investigation-registry/investigation-registry.types";
import { InMemoryRuntime } from "#src/investigation-registry/investigation-runtime.fixture";
import { createStatusServer } from "#src/investigation-status/status-server";
import { ResearchLoopOutcomeStatus } from "#src/research-cycle/research-loop.const";
import type { ResearchLoopOutcome } from "#src/research-cycle/research-loop.types";

const HISTORY = harnessEvents([
    { type: HarnessEventTypes.SESSION_STARTED, resumed: false },
    { type: HarnessEventTypes.REASONING_COMPLETED, text: "The evaluator needs a guard" },
    {
        type: HarnessEventTypes.TOOL,
        phase: HarnessToolPhases.STARTED,
        toolName: "Bash",
        callId: "toolu_01",
        payload: { input: { command: "pnpm vitest run evaluators/" } }
    }
]);

interface StreamedEvent {
    readonly name: string;
    readonly data: unknown;
}

class ActivityViewer {
    readonly #reader: ReadableStreamDefaultReader<Uint8Array>;
    readonly #decoder = new TextDecoder();
    readonly #pending: StreamedEvent[] = [];
    #buffer = "";

    constructor(body: ReadableStream<Uint8Array>) {
        this.#reader = body.getReader();
    }

    async next(): Promise<StreamedEvent> {
        while (this.#pending.length === 0) {
            const { value, done } = await this.#reader.read();
            if (done) {
                throw new Error("The activity stream closed before sending another event");
            }
            this.#buffer += this.#decoder.decode(value, { stream: true });
            let boundary = this.#buffer.indexOf("\n\n");
            while (boundary >= 0) {
                const block = this.#buffer.slice(0, boundary);
                this.#buffer = this.#buffer.slice(boundary + 2);
                const name = block.match(/^event: (.+)$/m)?.[1];
                const data = block.match(/^data: (.+)$/m)?.[1];
                if (name !== undefined && data !== undefined) {
                    this.#pending.push({ name, data: JSON.parse(data) });
                }
                boundary = this.#buffer.indexOf("\n\n");
            }
        }
        const event = this.#pending.shift();
        if (event === undefined) {
            throw new Error("Unexpected empty activity stream buffer");
        }
        return event;
    }

    async close(): Promise<void> {
        await this.#reader.cancel();
    }
}

async function startedRun(hub: AgentActivityHub, withHistory: boolean): Promise<AgentActivityRun> {
    const root = await mkdtemp(path.join(tmpdir(), "lab-activity-route-"));
    const artifactDirectory = path.join(root, "run-9f0c");
    await mkdir(artifactDirectory);
    if (withHistory) {
        await writeFile(
            path.join(artifactDirectory, HarnessArtifactFiles.EVENTS),
            HISTORY.map((event) => `${JSON.stringify(event)}\n`).join("")
        );
    }
    return hub.startRun(activityIdentity({ artifact_directory: artifactDirectory }));
}

/** A lab holding one investigation, listening, with its own activity hub to publish through. */
async function serve(): Promise<{ server: FastifyInstance; held: HeldInvestigation }> {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-activity-server-"));
    const runtime = new InMemoryRuntime();
    const registry = new InvestigationRegistry({
        workspaceRoot,
        persistence: runtime,
        investigations: runtime,
        researchLoop: async (): Promise<ResearchLoopOutcome> => ({
            status: ResearchLoopOutcomeStatus.CANCELLED
        })
    });
    const server = createStatusServer(registry);
    const held = await registry.create(InvestigationInputSchema.parse({ goal: "Watch the team" }));
    await server.listen({ host: "127.0.0.1", port: 0 });
    return { server, held };
}

function streamUrl(server: FastifyInstance, investigationId: string): string {
    const address = server.server.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}/api/investigations/${investigationId}/agents/activity`;
}

describe("agent activity route", () => {
    it("sends the roster before the history the frames belong to", async () => {
        const { server, held } = await serve();
        await startedRun(held.activity, true);
        const response = await fetch(streamUrl(server, held.workspace.investigationId));
        const viewer = new ActivityViewer(response.body as ReadableStream<Uint8Array>);

        const roster = await viewer.next();
        const frames = [await viewer.next(), await viewer.next(), await viewer.next()];

        expect(roster.name).toBe(AgentActivityStreamEvent.ROSTER);
        expect(roster.data).toHaveLength(1);
        expect(frames.map(({ name }) => name)).toEqual([
            AgentActivityStreamEvent.ACTIVITY,
            AgentActivityStreamEvent.ACTIVITY,
            AgentActivityStreamEvent.ACTIVITY
        ]);
        expect(frames.map(({ data }) => (data as { kind: string }).kind)).toEqual([
            AgentActivityFrameKind.RUN_STARTED,
            AgentActivityFrameKind.THINKING,
            AgentActivityFrameKind.TOOL
        ]);

        await viewer.close();
        await server.close();
    });

    it("carries on into what the agent does after a viewer has joined", async () => {
        const { server, held } = await serve();
        const run = await startedRun(held.activity, false);
        const response = await fetch(streamUrl(server, held.workspace.investigationId));
        const viewer = new ActivityViewer(response.body as ReadableStream<Uint8Array>);
        await viewer.next();

        for (const event of harnessEvents([
            { type: HarnessEventTypes.ASSISTANT_COMPLETED, text: "Added the guard" },
            { type: HarnessEventTypes.RUN_COMPLETED, result: harnessRunResult() }
        ])) {
            run.publish(event);
        }

        expect(await viewer.next()).toMatchObject({
            data: { kind: AgentActivityFrameKind.MESSAGE, text: "Added the guard" }
        });
        expect(await viewer.next()).toMatchObject({
            data: { kind: AgentActivityFrameKind.RUN_FINISHED }
        });

        await viewer.close();
        await server.close();
    });

    it("does not serve the stream for an investigation the lab does not hold", async () => {
        const { server } = await serve();

        const response = await server.inject({
            method: "GET",
            url: "/api/investigations/investigation-nobody-started/agents/activity"
        });

        expect(response.statusCode).toBe(404);
        await server.close();
    });
});
