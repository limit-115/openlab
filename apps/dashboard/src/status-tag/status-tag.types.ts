import type {
    CapabilityStatus,
    ClaimStatus,
    ExperimentStatus,
    InternalTaskStatus
} from "@lab/protocol/constants";

/** Every lifecycle status the dashboard renders as a status pill. */
export type TaggedStatus = InternalTaskStatus | ClaimStatus | ExperimentStatus | CapabilityStatus;
