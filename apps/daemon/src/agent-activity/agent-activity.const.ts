import { type HarnessRunStatus, HarnessRunStatuses } from "@lab/harness/agent-harness.const";
import {
    type HarnessDiagnosticLevel,
    HarnessDiagnosticLevels,
    type HarnessToolPhase,
    HarnessToolPhases
} from "@lab/harness/harness-event.const";
import { AgentRunStatus } from "@lab/protocol/agent-activity/agent-activity.const";
import {
    AgentDiagnosticLevel,
    AgentToolPhase
} from "@lab/protocol/agent-activity/agent-activity-frame.const";

/**
 * The harness package owns its own finite domains and never depends on the wire protocol, so a
 * harness event is translated into activity the dashboard understands through explicit tables.
 */
export const ActivityRunStatus: Record<HarnessRunStatus, AgentRunStatus> = {
    [HarnessRunStatuses.SUCCEEDED]: AgentRunStatus.SUCCEEDED,
    [HarnessRunStatuses.FAILED]: AgentRunStatus.FAILED,
    [HarnessRunStatuses.TIMED_OUT]: AgentRunStatus.TIMED_OUT,
    [HarnessRunStatuses.CANCELLED]: AgentRunStatus.CANCELLED
};

export const ActivityToolPhase: Record<HarnessToolPhase, AgentToolPhase> = {
    [HarnessToolPhases.STARTED]: AgentToolPhase.STARTED,
    [HarnessToolPhases.UPDATED]: AgentToolPhase.UPDATED,
    [HarnessToolPhases.COMPLETED]: AgentToolPhase.COMPLETED
};

export const ActivityDiagnosticLevel: Record<HarnessDiagnosticLevel, AgentDiagnosticLevel> = {
    [HarnessDiagnosticLevels.INFO]: AgentDiagnosticLevel.INFO,
    [HarnessDiagnosticLevels.WARNING]: AgentDiagnosticLevel.WARNING,
    [HarnessDiagnosticLevels.ERROR]: AgentDiagnosticLevel.ERROR
};

/**
 * How many runs the roster keeps. A lab mints fresh agent identifiers every cycle, so finished runs
 * are evicted oldest first once the roster is this long. Running ones are never evicted: their
 * number is bounded by how many agents the loop starts at once.
 */
export const ACTIVITY_RETAINED_RUNS = 32;

/** Stands in when a harness reports a failure without saying anything about it. */
export const UNSPECIFIED_DIAGNOSTIC = "The harness reported a failure without a message" as const;

/**
 * The payload fields worth putting beside a tool's name, in the order they are preferred. Every
 * harness shapes its tool payloads differently and the raw payload stays in the run's events.jsonl,
 * so the stream carries the one short subject an operator reads a tool call by: what it acted on.
 */
export const TOOL_DETAIL_KEYS = [
    "command",
    "file_path",
    "path",
    "pattern",
    "query",
    "url",
    "title",
    "description"
] as const;
