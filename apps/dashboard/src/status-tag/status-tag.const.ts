import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import type { BadgeVariant, TaggedStatus } from "#src/status-tag/status-tag.types";

/**
 * The protocol spells its statuses in lower case because they are values on a wire. On the page
 * they are words somebody reads, so each one is written out here the way a sentence would open.
 */
export const STATUS_TAG_LABEL: Record<TaggedStatus, string> = {
    [InternalTaskStatus.QUEUED]: "Queued",
    [InternalTaskStatus.LEASED]: "Leased",
    [InternalTaskStatus.RUNNING]: "Running",
    [InternalTaskStatus.SUCCEEDED]: "Succeeded",
    [InternalTaskStatus.FAILED]: "Failed",
    [InternalTaskStatus.CANCELLED]: "Cancelled",
    [ClaimStatus.PROPOSED]: "Proposed",
    [ClaimStatus.TESTING]: "Testing",
    [ClaimStatus.SUPPORTED]: "Supported",
    [ClaimStatus.REFUTED]: "Refuted",
    [ClaimStatus.REPRODUCED]: "Reproduced",
    [ExperimentStatus.PLANNED]: "Planned",
    [ExperimentStatus.TIMED_OUT]: "Timed out",
    [CapabilityStatus.OPEN]: "Open",
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
    [InternalTaskStatus.QUEUED]: PENDING_TONE,
    [InternalTaskStatus.LEASED]: PENDING_TONE,
    [InternalTaskStatus.RUNNING]: RUNNING_TONE,
    [InternalTaskStatus.SUCCEEDED]: SETTLED_TONE,
    [InternalTaskStatus.FAILED]: ADVERSE_TONE,
    [InternalTaskStatus.CANCELLED]: ADVERSE_TONE,
    [ClaimStatus.PROPOSED]: PENDING_TONE,
    [ClaimStatus.TESTING]: RUNNING_TONE,
    [ClaimStatus.SUPPORTED]: SETTLED_TONE,
    [ClaimStatus.REFUTED]: ADVERSE_TONE,
    [ClaimStatus.REPRODUCED]: SETTLED_TONE,
    [ExperimentStatus.PLANNED]: PENDING_TONE,
    [ExperimentStatus.TIMED_OUT]: ADVERSE_TONE,
    [CapabilityStatus.OPEN]: PENDING_TONE,
    [CapabilityStatus.ANSWERED]: SETTLED_TONE
};
