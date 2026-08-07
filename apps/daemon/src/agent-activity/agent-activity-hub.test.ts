import { HarnessRunStatuses } from "@openlab/harness/agent-harness.const";
import { HarnessEventTypes, HarnessToolPhases } from "@openlab/harness/harness-event.const";
import { AgentActivityPhase } from "@openlab/protocol/agent-activity/agent-activity.const";
import type { AgentActivity } from "@openlab/protocol/agent-activity/agent-activity.types";
import type { AgentActivityFrame } from "@openlab/protocol/agent-activity/agent-activity-frame.types";
import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import { describe, expect, it } from "vitest";
import { ACTIVITY_RETAINED_RUNS } from "#src/agent-activity/agent-activity.const";
import {
    activityIdentity,
    harnessEvents,
    harnessRunResult
} from "#src/agent-activity/agent-activity.fixture";
import { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";

function collect(hub: AgentActivityHub): AgentActivityFrame[] {
    const frames: AgentActivityFrame[] = [];
    hub.subscribe((frame) => frames.push(frame));
    return frames;
}

function finish(hub: AgentActivityHub, runId: string, updatedAt: string): void {
    const run = hub.startRun(activityIdentity({ run_id: runId, started_at: updatedAt }));
    for (const event of harnessEvents([
        { type: HarnessEventTypes.RUN_COMPLETED, result: harnessRunResult() }
    ])) {
        run.publish({ ...event, occurredAt: updatedAt });
    }
}

describe("AgentActivityHub", () => {
    it("moves an agent through the phases its frames describe", () => {
        const hub = new AgentActivityHub();
        const run = hub.startRun(activityIdentity());
        const phases: AgentActivityPhase[] = [];
        hub.subscribe((_frame, activity) => phases.push(activity.phase));

        for (const event of harnessEvents([
            { type: HarnessEventTypes.SESSION_STARTED },
            { type: HarnessEventTypes.REASONING_COMPLETED, text: "plan the run" },
            {
                type: HarnessEventTypes.TOOL,
                phase: HarnessToolPhases.STARTED,
                toolName: "Bash",
                callId: "toolu_01",
                payload: { input: { command: "pnpm test" } }
            },
            {
                type: HarnessEventTypes.USAGE,
                inputTokens: 1200,
                outputTokens: 340,
                cachedInputTokens: 900
            },
            { type: HarnessEventTypes.RUN_COMPLETED, result: harnessRunResult() }
        ])) {
            run.publish(event);
        }

        expect(phases).toEqual([
            AgentActivityPhase.STARTING,
            AgentActivityPhase.THINKING,
            AgentActivityPhase.USING_TOOL,
            AgentActivityPhase.USING_TOOL,
            AgentActivityPhase.FINISHED
        ]);
        expect(hub.roster()[0]).toMatchObject({
            session_id: "session-1",
            status: AgentRunStatus.SUCCEEDED,
            usage: { input_tokens: 1200, output_tokens: 340, cached_input_tokens: 900 }
        });
    });

    it("keeps concurrent runs on their own lines", () => {
        const hub = new AgentActivityHub();
        const codex = hub.startRun(activityIdentity({ run_id: "run-codex" }));
        hub.startRun(activityIdentity({ run_id: "run-claude" }));
        const frames = collect(hub);

        for (const event of harnessEvents([
            { type: HarnessEventTypes.ASSISTANT_COMPLETED, text: "from the codex researcher" }
        ])) {
            codex.publish(event);
        }

        expect(frames.map(({ run_id }) => run_id)).toEqual(["run-codex"]);
        expect(hub.roster().find(({ run_id }) => run_id === "run-claude")?.phase).toBe(
            AgentActivityPhase.STARTING
        );
    });

    it("closes a run whose harness stream ended without saying how it went", () => {
        const hub = new AgentActivityHub();
        const run = hub.startRun(activityIdentity());
        const frames = collect(hub);

        run.abandon("claude CLI completed without reporting a session identifier");

        expect(frames).toHaveLength(1);
        expect(hub.roster()[0]).toMatchObject({
            status: AgentRunStatus.FAILED,
            phase: AgentActivityPhase.FINISHED,
            error: "claude CLI completed without reporting a session identifier"
        });
    });

    it("leaves a completed run's outcome alone when the consumer also abandons it", () => {
        const hub = new AgentActivityHub();
        const run = hub.startRun(activityIdentity());
        for (const event of harnessEvents([
            {
                type: HarnessEventTypes.RUN_COMPLETED,
                result: harnessRunResult({
                    status: HarnessRunStatuses.CANCELLED,
                    error: "claude harness run was cancelled"
                })
            }
        ])) {
            run.publish(event);
        }

        run.abandon("stream ended");

        expect(hub.roster()[0]).toMatchObject({
            status: AgentRunStatus.CANCELLED,
            error: "claude harness run was cancelled"
        });
    });

    it("evicts the oldest finished runs but keeps every running one", () => {
        const hub = new AgentActivityHub();
        for (let index = 0; index < ACTIVITY_RETAINED_RUNS + 4; index += 1) {
            finish(hub, `run-${String(index).padStart(3, "0")}`, minute(index));
        }
        hub.startRun(activityIdentity({ run_id: "run-live" }));

        const roster = hub.roster();
        const retained = roster.map(({ run_id }: AgentActivity) => run_id);

        expect(retained).toContain("run-live");
        expect(retained).not.toContain("run-000");
        expect(retained).toContain("run-035");
    });

    it("stops delivering to a listener that unsubscribed", () => {
        const hub = new AgentActivityHub();
        const run = hub.startRun(activityIdentity());
        const frames: AgentActivityFrame[] = [];
        const unsubscribe = hub.subscribe((frame) => frames.push(frame));

        unsubscribe();
        for (const event of harnessEvents([
            { type: HarnessEventTypes.ASSISTANT_COMPLETED, text: "done" }
        ])) {
            run.publish(event);
        }

        expect(frames).toEqual([]);
    });
});

function minute(index: number): string {
    return `2026-08-03T10:${String(index).padStart(2, "0")}:00.000Z`;
}
