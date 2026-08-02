import {
    AgentActivityPhase,
    AgentRunStatus
} from "@lab/protocol/agent-activity/agent-activity.const";
import {
    AgentDiagnosticLevel,
    AgentToolPhase
} from "@lab/protocol/agent-activity/agent-activity-frame.const";
import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import type { BadgeVariant } from "#src/status-tag/status-tag.types";

export const TEAM_GRID = "grid gap-4 lg:grid-cols-2" as const;

export const AGENT_CARD = "flex flex-col gap-3 rounded-2xl border p-4" as const;

export const AGENT_CARD_HEADER = "flex flex-wrap items-start justify-between gap-3" as const;

export const AGENT_EXECUTION = "text-sm text-muted-foreground" as const;

/** The transcript scrolls on its own so a talkative agent cannot push the roster off the page. */
export const AGENT_TRANSCRIPT = "flex max-h-96 flex-col gap-2 overflow-y-auto" as const;

export const TRANSCRIPT_TEXT = "border-l-2 pl-3 text-sm whitespace-pre-wrap break-words" as const;

export const TRANSCRIPT_TOOL = "flex flex-wrap items-baseline gap-2 text-sm" as const;

export const TRANSCRIPT_DETAIL = "min-w-0 break-words text-muted-foreground" as const;

export const TRANSCRIPT_THINKING_TRIGGER =
    "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" as const;

/** Full paths stay readable by wrapping, because an operator has to be able to copy them. */
export const AGENT_ARTIFACTS = "break-all text-sm text-muted-foreground" as const;

export const PHASE_LABEL: Record<AgentActivityPhase, string> = {
    [AgentActivityPhase.STARTING]: "Starting",
    [AgentActivityPhase.THINKING]: "Thinking",
    [AgentActivityPhase.RESPONDING]: "Writing",
    [AgentActivityPhase.USING_TOOL]: "Using a tool",
    [AgentActivityPhase.FINISHED]: "Finished"
};

/** The same emphasis the rest of the dashboard uses: live work loudest, failures as warnings. */
export const RUN_STATUS_TONE: Record<AgentRunStatus, BadgeVariant> = {
    [AgentRunStatus.RUNNING]: "default",
    [AgentRunStatus.SUCCEEDED]: "secondary",
    [AgentRunStatus.FAILED]: "destructive",
    [AgentRunStatus.TIMED_OUT]: "destructive",
    [AgentRunStatus.CANCELLED]: "outline"
};

export const TOOL_PHASE_MARK: Record<AgentToolPhase, string> = {
    [AgentToolPhase.STARTED]: "size-2 rounded-full bg-primary",
    [AgentToolPhase.UPDATED]: "size-2 rounded-full bg-primary/50",
    [AgentToolPhase.COMPLETED]: "size-2 rounded-full bg-muted-foreground"
};

export const DIAGNOSTIC_TONE: Record<AgentDiagnosticLevel, string> = {
    [AgentDiagnosticLevel.INFO]: "text-muted-foreground",
    [AgentDiagnosticLevel.WARNING]: "text-foreground",
    [AgentDiagnosticLevel.ERROR]: "text-destructive"
};

export const HARNESS_LABEL: Record<AgentHarnessKind, string> = {
    [AgentHarnessKind.CODEX]: "Codex",
    [AgentHarnessKind.CLAUDE]: "Claude",
    [AgentHarnessKind.GLM]: "GLM"
};

export const NO_AGENTS_TITLE = "No agent is running" as const;

export const NO_AGENTS_DESCRIPTION =
    "Directors, researchers, critics and verifiers appear here while the lab is working." as const;

export const NO_ACTIVITY_YET = "Waiting for the harness to report" as const;
