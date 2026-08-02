import {
    ClaimStatus,
    type ClaimStatus as ClaimStatusValue
} from "@lab/protocol/claims/claim-status.const";

export const legalClaimTransitions: Readonly<
    Record<ClaimStatusValue, ReadonlySet<ClaimStatusValue>>
> = {
    [ClaimStatus.PROPOSED]: new Set([ClaimStatus.TESTING, ClaimStatus.REFUTED]),
    [ClaimStatus.TESTING]: new Set([ClaimStatus.SUPPORTED, ClaimStatus.REFUTED]),
    [ClaimStatus.SUPPORTED]: new Set([
        ClaimStatus.TESTING,
        ClaimStatus.REFUTED,
        ClaimStatus.REPRODUCED
    ]),
    [ClaimStatus.REFUTED]: new Set([ClaimStatus.TESTING]),
    [ClaimStatus.REPRODUCED]: new Set([ClaimStatus.TESTING, ClaimStatus.REFUTED])
};
