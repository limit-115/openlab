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

/**
 * The roster starts where the thread starts. Pinning it to the viewport pushed it down the moment
 * the page moved, so the two columns opened at different heights and never lined up again.
 *
 * A column rather than a grid: a grid row is at least as wide as its widest entry measures, and an
 * entry holding an unwrapped command measures the whole command, which widened the roster past its
 * own track and over the thread beside it.
 */
export const TEAM_ROSTER = "flex list-none flex-col gap-2" as const;

export const ROSTER_ENTRY =
    "flex w-full min-w-0 flex-col gap-1 rounded-2xl border p-3 text-left transition-colors hover:bg-muted/50 motion-reduce:transition-none" as const;

/**
 * The one being read is marked on the entry itself, not only by what fills the other column. The
 * border carries it alone: filling the entry would fight the hover the roster already answers with.
 */
export const ROSTER_ENTRY_SELECTED = "border-primary/50" as const;

export const ROSTER_ENTRY_TOP = "flex flex-wrap items-center gap-x-2 gap-y-1" as const;

export const ROSTER_ROLE = "text-sm font-semibold capitalize" as const;

export const ROSTER_EXECUTION = "text-sm text-muted-foreground" as const;

/**
 * An entry is a way in rather than the place an agent is read, so the objective is cut to two
 * lines. Opening the agent is what shows it whole, and the roster stays a list you can scan.
 */
export const ROSTER_OBJECTIVE = "line-clamp-2 text-sm wrap-anywhere" as const;

export const ROSTER_LINE = "flex min-w-0 gap-x-2 text-sm" as const;

export const ROSTER_VERB = "flex-none font-medium" as const;

/**
 * A command runs to hundreds of characters and would bury every other agent in the roster, so it
 * ends in an ellipsis here. The thread prints the same call in full, one click away.
 */
export const ROSTER_DETAIL = "min-w-0 truncate text-muted-foreground" as const;

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

export const TRANSCRIPT_TEXT = "border-l-2 pl-3 text-sm whitespace-pre-wrap wrap-anywhere" as const;

export const TRANSCRIPT_TOOL = "flex flex-wrap items-baseline gap-2 text-sm" as const;

/**
 * `wrap-anywhere` rather than `break-words`: both fold a long path onto the next line, but only
 * this one lets the element measure smaller than that path, and a column sized to an unbreakable
 * argument is what pushes the thread out over the roster.
 */
export const TRANSCRIPT_DETAIL = "min-w-0 wrap-anywhere text-muted-foreground" as const;

export const TRANSCRIPT_THINKING_TRIGGER =
    "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" as const;

/** Full paths stay readable by wrapping, because an operator has to be able to copy them. */
export const AGENT_ARTIFACTS = "wrap-anywhere text-sm text-muted-foreground" as const;

export const PHASE_LABEL: Record<AgentActivityPhase, string> = {
    [AgentActivityPhase.STARTING]: "Starting",
    [AgentActivityPhase.THINKING]: "Thinking",
    [AgentActivityPhase.RESPONDING]: "Writing",
    [AgentActivityPhase.USING_TOOL]: "Using a tool",
    [AgentActivityPhase.FINISHED]: "Finished"
};

/**
 * What the agent is doing and how its run is going are two different questions, so every place an
 * agent appears answers both. The phase is the quieter of the two: it changes every few seconds,
 * while the status is what an operator scanning the roster is looking for.
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
