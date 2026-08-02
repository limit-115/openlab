import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import type { BadgeVariant, TaggedStatus } from "#src/status-tag/status-tag.types";

/**
 * Emphasis follows attention, not sentiment: what is happening now reads loudest, what went wrong
 * reads as a warning, settled work recedes, and work that has not started stays quiet.
 */
const RUNNING_TONE: BadgeVariant = "default";
const ADVERSE_TONE: BadgeVariant = "destructive";
const SETTLED_TONE: BadgeVariant = "secondary";
const PENDING_TONE: BadgeVariant = "outline";

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
    [CapabilityStatus.OPEN]: RUNNING_TONE,
    [CapabilityStatus.PROVIDED]: SETTLED_TONE,
    [CapabilityStatus.OBSOLETE]: PENDING_TONE
};
