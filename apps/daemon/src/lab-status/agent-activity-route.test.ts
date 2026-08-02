import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { HarnessEventTypes, HarnessToolPhases } from "@lab/harness/harness-event.const";
import { HarnessArtifactFiles } from "@lab/harness/harness-run-artifacts.const";
import { AgentActivityStreamEvent } from "@lab/protocol/agent-activity/agent-activity.const";
import { AgentActivityFrameKind } from "@lab/protocol/agent-activity/agent-activity-frame.const";
import type { FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";
import {
    activityIdentity,
    harnessEvents,
    harnessRunResult
} from "#src/agent-activity/agent-activity.fixture";
import { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { AgentActivityRun } from "#src/agent-activity/agent-activity-hub.types";
import { AGENT_ACTIVITY_ROUTE } from "#src/lab-status/agent-activity-route.const";
import { createStatusServer } from "#src/lab-status/status-server";
import { LabWorkspace } from "#src/lab-workspace/lab-workspace";

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

async function serve(hub?: AgentActivityHub): Promise<FastifyInstance> {
    const directory = await mkdtemp(path.join(tmpdir(), "lab-activity-server-"));
    const taskPath = path.join(directory, "task.json");
    await writeFile(taskPath, JSON.stringify({ goal: "Watch the team" }));
    const workspace = await LabWorkspace.initialize(directory, taskPath);
    const server = createStatusServer(workspace, hub === undefined ? {} : { activity: hub });
    await server.listen({ host: "127.0.0.1", port: 0 });
    return server;
}

function streamUrl(server: FastifyInstance): string {
    const address = server.server.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}${AGENT_ACTIVITY_ROUTE}`;
}

describe("agent activity route", () => {
    it("sends the roster before the history the frames belong to", async () => {
        const hub = new AgentActivityHub();
        await startedRun(hub, true);
        const server = await serve(hub);
        const response = await fetch(streamUrl(server));
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
        const hub = new AgentActivityHub();
        const run = await startedRun(hub, false);
        const server = await serve(hub);
        const response = await fetch(streamUrl(server));
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

    it("does not serve the stream to a lab that is not publishing activity", async () => {
        const server = await serve();

        const response = await server.inject({ method: "GET", url: AGENT_ACTIVITY_ROUTE });

        expect(response.statusCode).toBe(404);
        await server.close();
    });
});
