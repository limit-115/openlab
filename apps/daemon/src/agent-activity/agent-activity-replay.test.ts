import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { HarnessRunStatuses } from "@lab/harness/agent-harness.const";
import { HarnessEventTypes, HarnessToolPhases } from "@lab/harness/harness-event.const";
import type { HarnessEvent } from "@lab/harness/harness-event.types";
import { HarnessArtifactFiles } from "@lab/harness/harness-run-artifacts.const";
import { AgentActivityPhase } from "@lab/protocol/agent-activity/agent-activity.const";
import type { AgentActivity } from "@lab/protocol/agent-activity/agent-activity.types";
import { AgentActivityFrameKind } from "@lab/protocol/agent-activity/agent-activity-frame.const";
import type { AgentActivityFrame } from "@lab/protocol/agent-activity/agent-activity-frame.types";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { describe, expect, it } from "vitest";
import { activityIdentity, harnessEvents } from "#src/agent-activity/agent-activity.fixture";
import { replayAgentActivity } from "#src/agent-activity/agent-activity-replay";
import { HarnessEventTranslator } from "#src/agent-activity/harness-event-translation";

const TRANSCRIPT = harnessEvents([
    { type: HarnessEventTypes.SESSION_STARTED, resumed: false },
    { type: HarnessEventTypes.REASONING_DELTA, text: "The evaluator " },
    { type: HarnessEventTypes.REASONING_DELTA, text: "fails on an empty sample." },
    {
        type: HarnessEventTypes.REASONING_COMPLETED,
        text: "The evaluator fails on an empty sample."
    },
    {
        type: HarnessEventTypes.TOOL,
        phase: HarnessToolPhases.STARTED,
        toolName: "Bash",
        callId: "toolu_01",
        payload: { input: { command: "pnpm vitest run evaluators/" } }
    },
    { type: HarnessEventTypes.ASSISTANT_DELTA, text: "Adding the " },
    { type: HarnessEventTypes.ASSISTANT_DELTA, text: "guard now" }
]);

async function writeTranscript(events: readonly HarnessEvent[]): Promise<AgentActivity> {
    const root = await mkdtemp(path.join(tmpdir(), "lab-activity-replay-"));
    const artifactDirectory = path.join(root, "run-9f0c");
    await mkdir(artifactDirectory);
    await writeFile(
        path.join(artifactDirectory, HarnessArtifactFiles.EVENTS),
        events.map((event) => `${JSON.stringify(event)}\n`).join("")
    );
    return runningActivity(artifactDirectory);
}

function runningActivity(artifactDirectory: string): AgentActivity {
    return {
        ...activityIdentity({ artifact_directory: artifactDirectory }),
        session_id: "session-1",
        phase: AgentActivityPhase.THINKING,
        status: AgentRunStatus.RUNNING,
        usage: null,
        error: null,
        updated_at: "2026-08-03T10:00:01.000Z"
    };
}

async function replay(activity: AgentActivity): Promise<AgentActivityFrame[]> {
    const frames: AgentActivityFrame[] = [];
    for await (const frame of replayAgentActivity(activity)) {
        frames.push(frame);
    }
    return frames;
}

function live(activity: AgentActivity, events: readonly HarnessEvent[]): AgentActivityFrame[] {
    const translator = new HarnessEventTranslator(activity);
    return events
        .map((event) => translator.translate(event))
        .filter((frame) => frame !== undefined);
}

describe("replayAgentActivity", () => {
    it("folds the chunks of a finished turn into the sealed text that closed it", async () => {
        const frames = await replay(await writeTranscript(TRANSCRIPT));
        const thinking = frames.filter(({ kind }) => kind === AgentActivityFrameKind.THINKING);

        expect(thinking).toHaveLength(1);
        expect(thinking[0]).toMatchObject({
            sealed: true,
            text: "The evaluator fails on an empty sample."
        });
    });

    it("hands over the turn still being written as one frame the live chunks continue", async () => {
        const frames = await replay(await writeTranscript(TRANSCRIPT));
        const message = frames.filter(({ kind }) => kind === AgentActivityFrameKind.MESSAGE);

        expect(message).toHaveLength(1);
        expect(message[0]).toMatchObject({
            sealed: false,
            turn: 0,
            text: "Adding the guard now",
            sequence: 7
        });
    });

    it("agrees with the live stream on every turn it has already sealed", async () => {
        const activity = await writeTranscript(TRANSCRIPT);
        const replayed = await replay(activity);
        const streamed = live(activity, TRANSCRIPT);

        expect(replayed.filter((frame) => "sealed" in frame && frame.sealed)).toEqual(
            streamed.filter((frame) => "sealed" in frame && frame.sealed)
        );
        expect(replayed.filter(({ kind }) => kind === AgentActivityFrameKind.TOOL)).toEqual(
            streamed.filter(({ kind }) => kind === AgentActivityFrameKind.TOOL)
        );
    });

    it("reports the sequence the live stream should be resumed from", async () => {
        const frames = await replay(await writeTranscript(TRANSCRIPT));
        const sequences = frames.map(({ sequence }) => sequence);

        expect(Math.max(...sequences)).toBe(TRANSCRIPT.length);
    });

    it("ends a finished run with the outcome only its manifest kept", async () => {
        const activity = await writeTranscript(TRANSCRIPT);
        await writeFile(
            path.join(activity.artifact_directory, HarnessArtifactFiles.MANIFEST),
            JSON.stringify({
                status: HarnessRunStatuses.FAILED,
                error: "codex harness run failed",
                finishedAt: "2026-08-03T10:05:00.000Z"
            })
        );

        expect((await replay(activity)).at(-1)).toEqual({
            run_id: activity.run_id,
            sequence: TRANSCRIPT.length + 1,
            occurred_at: "2026-08-03T10:05:00.000Z",
            kind: AgentActivityFrameKind.RUN_FINISHED,
            status: AgentRunStatus.FAILED,
            error: "codex harness run failed"
        });
    });

    it("leaves a run whose manifest says it is still going unfinished", async () => {
        const activity = await writeTranscript(TRANSCRIPT);
        await writeFile(
            path.join(activity.artifact_directory, HarnessArtifactFiles.MANIFEST),
            JSON.stringify({ status: HarnessRunStatuses.RUNNING })
        );
        const frames = await replay(activity);

        expect(frames.some(({ kind }) => kind === AgentActivityFrameKind.RUN_FINISHED)).toBe(false);
    });

    it("yields nothing for a run that has not opened its event file yet", async () => {
        const root = await mkdtemp(path.join(tmpdir(), "lab-activity-replay-"));

        expect(await replay(runningActivity(path.join(root, "run-missing")))).toEqual([]);
    });

    it("ignores a half-written line at the end of a file still being appended to", async () => {
        const activity = await writeTranscript(TRANSCRIPT);
        const intact = await replay(activity);
        await writeFile(
            path.join(activity.artifact_directory, HarnessArtifactFiles.EVENTS),
            `${TRANSCRIPT.map((event) => JSON.stringify(event)).join("\n")}\n{"type":"tool","seq`
        );

        expect(await replay(activity)).toEqual(intact);
    });
});
