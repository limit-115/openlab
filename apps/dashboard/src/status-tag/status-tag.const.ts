import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { AssumptionStatus } from "@lab/protocol/assumptions/assumption-status.const";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@lab/protocol/findings/finding-status.const";
import type { BadgeVariant, TaggedStatus } from "#src/status-tag/status-tag.types";

/**
 * The protocol spells its statuses in lower case because they are values on a wire. On the page
 * they are words somebody reads, so each one is written out here the way a sentence would open.
 */
export const STATUS_TAG_LABEL: Record<TaggedStatus, string> = {
    [AgentRunStatus.RUNNING]: "Running",
    [AgentRunStatus.SUCCEEDED]: "Succeeded",
    [AgentRunStatus.FAILED]: "Failed",
    [AgentRunStatus.TIMED_OUT]: "Timed out",
    [AgentRunStatus.CANCELLED]: "Cancelled",
    [AgentRunStatus.BLOCKED]: "Blocked",
    [AssumptionStatus.OPEN]: "Open",
    [AssumptionStatus.RESEARCHING]: "Being researched",
    [AssumptionStatus.EXHAUSTED]: "Ran out",
    [AssumptionStatus.CONFIRMED]: "Confirmed",
    [FindingStatus.UNVERIFIED]: "Unverified",
    [FindingStatus.REFUTED]: "Refuted",
    [CapabilityStatus.ANSWERED]: "Answered"
};

/**
 * Four colours, one question each: blue is happening now, green came out well, red went wrong, and
 * amber is waiting on something. A status an operator has to read at a glance cannot be grey.
 */
const RUNNING_TONE: BadgeVariant = "default";
const ADVERSE_TONE: BadgeVariant = "destructive";
const SETTLED_TONE: BadgeVariant = "success";
const PENDING_TONE: BadgeVariant = "warning";

export const STATUS_TAG_TONE: Record<TaggedStatus, BadgeVariant> = {
    [AgentRunStatus.RUNNING]: RUNNING_TONE,
    [AgentRunStatus.SUCCEEDED]: SETTLED_TONE,
    [AgentRunStatus.FAILED]: ADVERSE_TONE,
    [AgentRunStatus.TIMED_OUT]: ADVERSE_TONE,
    [AgentRunStatus.CANCELLED]: ADVERSE_TONE,
    [AgentRunStatus.BLOCKED]: PENDING_TONE,
    [AssumptionStatus.OPEN]: PENDING_TONE,
    [AssumptionStatus.RESEARCHING]: RUNNING_TONE,
    [AssumptionStatus.EXHAUSTED]: ADVERSE_TONE,
    [AssumptionStatus.CONFIRMED]: SETTLED_TONE,
    [FindingStatus.UNVERIFIED]: PENDING_TONE,
    [FindingStatus.REFUTED]: ADVERSE_TONE,
    [CapabilityStatus.ANSWERED]: SETTLED_TONE
};
