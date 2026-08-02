import {
    CapabilityStatus,
    ClaimStatus,
    ExperimentStatus,
    InternalTaskStatus
} from "@lab/protocol/constants";
import type { TaggedStatus } from "#src/status-tag/status-tag.types";

export const STATUS_TAG =
    "inline-flex whitespace-nowrap rounded-full border px-[6px] py-[3px] text-[8px] font-[680] uppercase tracking-[0.04em]" as const;

const NEUTRAL_TONE = "border-line bg-surface-soft text-fg-muted" as const;
const ACTIVE_TONE = "border-cyan/19 bg-cyan/10 text-cyan" as const;
const RESOLVED_TONE = "border-green/19 bg-green/12 text-green" as const;
const ADVERSE_TONE = "border-red/20 bg-red/11 text-red" as const;

export const STATUS_TAG_TONE: Record<TaggedStatus, string> = {
    [InternalTaskStatus.QUEUED]: NEUTRAL_TONE,
    [InternalTaskStatus.LEASED]: NEUTRAL_TONE,
    [InternalTaskStatus.RUNNING]: ACTIVE_TONE,
    [InternalTaskStatus.SUCCEEDED]: RESOLVED_TONE,
    [InternalTaskStatus.FAILED]: ADVERSE_TONE,
    [InternalTaskStatus.CANCELLED]: ADVERSE_TONE,
    [ClaimStatus.PROPOSED]: NEUTRAL_TONE,
    [ClaimStatus.TESTING]: ACTIVE_TONE,
    [ClaimStatus.SUPPORTED]: RESOLVED_TONE,
    [ClaimStatus.REFUTED]: ADVERSE_TONE,
    [ClaimStatus.REPRODUCED]: RESOLVED_TONE,
    [ExperimentStatus.PLANNED]: NEUTRAL_TONE,
    [ExperimentStatus.TIMED_OUT]: ADVERSE_TONE,
    [CapabilityStatus.OPEN]: ACTIVE_TONE,
    [CapabilityStatus.PROVIDED]: RESOLVED_TONE,
    [CapabilityStatus.OBSOLETE]: NEUTRAL_TONE
};
