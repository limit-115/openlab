import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";

export const ClaimFilter = {
    ALL: "all",
    OPEN: "open",
    SUPPORTED: ClaimStatus.SUPPORTED,
    REPRODUCED: ClaimStatus.REPRODUCED,
    REFUTED: ClaimStatus.REFUTED
} as const;
export type ClaimFilter = (typeof ClaimFilter)[keyof typeof ClaimFilter];

export const CLAIM_FILTERS: Array<{ value: ClaimFilter; label: string }> = [
    { value: ClaimFilter.ALL, label: "All" },
    { value: ClaimFilter.OPEN, label: "Open" },
    { value: ClaimFilter.SUPPORTED, label: "Supported" },
    { value: ClaimFilter.REPRODUCED, label: "Reproduced" },
    { value: ClaimFilter.REFUTED, label: "Refuted" }
];
