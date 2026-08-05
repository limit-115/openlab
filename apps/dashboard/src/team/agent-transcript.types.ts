import type { AgentActivity } from "@openlab/protocol/agent-activity/agent-activity.types";
import type {
    AgentActivityFrameKind,
    AgentDiagnosticLevel,
    AgentToolPhase
} from "@openlab/protocol/agent-activity/agent-activity-frame.const";

/** A turn of the agent's own words, growing while it writes and fixed once the turn is sealed. */
export interface TranscriptTurn {
    readonly id: string;
    readonly kind: typeof AgentActivityFrameKind.THINKING | typeof AgentActivityFrameKind.MESSAGE;
    readonly turn: number;
    readonly text: string;
    readonly sealed: boolean;
}

/** One tool call, from the moment it starts to the moment it reports back. */
export interface TranscriptToolCall {
    readonly id: string;
    readonly kind: typeof AgentActivityFrameKind.TOOL;
    readonly toolName: string;
    readonly callId: string | null;
    readonly phase: AgentToolPhase;
    readonly detail: string | null;
}

export interface TranscriptDiagnostic {
    readonly id: string;
    readonly kind: typeof AgentActivityFrameKind.DIAGNOSTIC;
    readonly level: AgentDiagnosticLevel;
    readonly message: string;
}

export type TranscriptEntry = TranscriptTurn | TranscriptToolCall | TranscriptDiagnostic;

/** An agent as the Team tab shows it: what it runs on, and what it has been doing. */
export interface WatchedAgent {
    readonly activity: AgentActivity;
    readonly transcript: readonly TranscriptEntry[];
}
