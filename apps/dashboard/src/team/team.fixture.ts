import { AgentActivityPhase } from "@lab/protocol/agent-activity/agent-activity.const";
import type { AgentActivity } from "@lab/protocol/agent-activity/agent-activity.types";
import {
    AgentActivityFrameKind,
    AgentToolPhase
} from "@lab/protocol/agent-activity/agent-activity-frame.const";
import type { AgentActivityFrame } from "@lab/protocol/agent-activity/agent-activity-frame.types";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { AgentEffortLevel, AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";

export const RUN_ID = "run-researcher-9f0c" as const;

export function watchedActivity(overrides: Partial<AgentActivity> = {}): AgentActivity {
    return {
        run_id: RUN_ID,
        assumption_id: "assumption-landmarks",
        role: AgentRole.RESEARCHER,
        execution: {
            harness: AgentHarnessKind.CLAUDE,
            model: "claude-opus-5",
            effort: AgentEffortLevel.HIGH
        },
        artifact_directory: "/lab/workspaces/cycle-1/researcher-000/.lab-artifacts/run-9f0c",
        started_at: "2026-08-03T10:00:00.000Z",
        session_id: "session-1",
        phase: AgentActivityPhase.THINKING,
        status: AgentRunStatus.RUNNING,
        usage: null,
        error: null,
        updated_at: "2026-08-03T10:00:01.000Z",
        ...overrides
    };
}

let sequence = 0;

export function resetFrameSequence(): void {
    sequence = 0;
}

/** Omitting keys from a union has to distribute, or every frame collapses to its common fields. */
type FrameBody<Frame = AgentActivityFrame> = Frame extends unknown
    ? Omit<Frame, "run_id" | "sequence" | "occurred_at">
    : never;

export function frame(body: FrameBody, runId: string = RUN_ID): AgentActivityFrame {
    sequence += 1;
    return {
        ...body,
        run_id: runId,
        sequence,
        occurred_at: "2026-08-03T10:00:02.000Z"
    } as AgentActivityFrame;
}

export function thinking(text: string, turn: number, sealed: boolean): AgentActivityFrame {
    return frame({ kind: AgentActivityFrameKind.THINKING, turn, text, sealed });
}

export function message(text: string, turn: number, sealed: boolean): AgentActivityFrame {
    return frame({ kind: AgentActivityFrameKind.MESSAGE, turn, text, sealed });
}

export function toolCall(
    toolName: string,
    callId: string | null,
    phase: AgentToolPhase = AgentToolPhase.STARTED,
    detail: string | null = null
): AgentActivityFrame {
    return frame({
        kind: AgentActivityFrameKind.TOOL,
        tool_name: toolName,
        call_id: callId,
        phase,
        detail
    });
}
