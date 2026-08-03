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

/**
 * The roster on one side, the transcript of whoever is selected on the other. Every agent stays
 * visible while one of them is read, which is what a grid of equal cards cannot do.
 */
export const TEAM_SPLIT =
    "grid items-start gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]" as const;

/** The roster follows the page down, so switching agents never means scrolling back up. */
export const TEAM_ROSTER = "grid list-none gap-2 lg:sticky lg:top-24" as const;

export const ROSTER_ENTRY =
    "flex w-full min-w-0 flex-col gap-1 rounded-2xl border p-3 text-left transition-colors hover:bg-muted/50 motion-reduce:transition-none" as const;

/** The one being read is marked on the entry itself, not only by what fills the other column. */
export const ROSTER_ENTRY_SELECTED = "border-primary/50 bg-muted/60" as const;

export const ROSTER_ENTRY_TOP = "flex flex-wrap items-baseline gap-x-2 gap-y-1" as const;

export const ROSTER_PRESENCE = "size-2 flex-none self-center rounded-full" as const;

export const ROSTER_ROLE = "text-sm font-semibold capitalize" as const;

export const ROSTER_EXECUTION = "text-sm text-muted-foreground" as const;

export const ROSTER_OBJECTIVE = "text-sm break-words" as const;

export const ROSTER_LINE = "flex flex-wrap gap-x-2 text-sm" as const;

export const ROSTER_VERB = "font-medium" as const;

/** A command or a path is shown whole here too: the roster is read, not skimmed past. */
export const ROSTER_DETAIL = "min-w-0 break-words text-muted-foreground" as const;

export const AGENT_THREAD = "flex min-w-0 flex-col gap-3 rounded-2xl border p-4" as const;

export const AGENT_CARD_HEADER = "flex flex-wrap items-start justify-between gap-3" as const;

export const AGENT_STATUS_GROUP = "flex flex-wrap items-center gap-2" as const;

export const AGENT_EXECUTION = "text-sm text-muted-foreground" as const;

/** The transcript scrolls on its own so a talkative agent cannot push the roster off the page. */
export const AGENT_TRANSCRIPT = "max-h-[32rem] overflow-y-auto" as const;

/** The lines sit in their own element because the follower measures them apart from the viewport. */
export const TRANSCRIPT_ENTRIES = "flex flex-col gap-2" as const;

/**
 * A card that mounts with history behind it opens at the newest line instead of animating down to
 * it: the operator asked for this agent, not for a scroll.
 */
export const TRANSCRIPT_INITIAL_SCROLL = "instant" as const;

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

/**
 * What the agent is doing and how its run is going are two different questions, so the card answers
 * both. The phase is the quieter of the two: it changes every few seconds, while the status is what
 * an operator scanning the roster is looking for.
 */
export const PHASE_TONE: BadgeVariant = "outline";

export const RUN_STATUS_LABEL: Record<AgentRunStatus, string> = {
    [AgentRunStatus.RUNNING]: "Running",
    [AgentRunStatus.SUCCEEDED]: "Succeeded",
    [AgentRunStatus.FAILED]: "Failed",
    [AgentRunStatus.TIMED_OUT]: "Timed out",
    [AgentRunStatus.CANCELLED]: "Cancelled"
};

/** The same emphasis the rest of the dashboard uses: live work loudest, failures as warnings. */
export const RUN_STATUS_TONE: Record<AgentRunStatus, BadgeVariant> = {
    [AgentRunStatus.RUNNING]: "default",
    [AgentRunStatus.SUCCEEDED]: "secondary",
    [AgentRunStatus.FAILED]: "destructive",
    [AgentRunStatus.TIMED_OUT]: "destructive",
    [AgentRunStatus.CANCELLED]: "outline"
};

/** The roster carries the run status as a mark, since a row has no room for a second badge. */
export const ROSTER_PRESENCE_TONE: Record<AgentRunStatus, string> = {
    [AgentRunStatus.RUNNING]: "bg-primary ring-4 ring-primary/20",
    [AgentRunStatus.SUCCEEDED]: "bg-muted-foreground",
    [AgentRunStatus.FAILED]: "bg-destructive",
    [AgentRunStatus.TIMED_OUT]: "bg-destructive",
    [AgentRunStatus.CANCELLED]: "bg-border"
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
