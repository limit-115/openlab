import { AgentRunStatus } from "@nightlab/protocol/agent-runs/agent-run-status.const";
import { AssumptionStatus } from "@nightlab/protocol/assumptions/assumption-status.const";
import { CapabilityStatus } from "@nightlab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@nightlab/protocol/findings/finding-status.const";
import type { BadgeVariant, TaggedStatus } from "#src/status-tag/status-tag.types";

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
