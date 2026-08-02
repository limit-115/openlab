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

export const FILTER_GROUP =
    "flex gap-[3px] rounded-[7px] border border-line bg-surface-soft p-[3px] max-[620px]:max-w-[160px] max-[620px]:overflow-x-auto" as const;

export const FILTER_BUTTON = "cursor-pointer rounded px-[7px] py-1 text-[9px]" as const;

export const FILTER_BUTTON_ACTIVE = "bg-line text-fg" as const;

export const FILTER_BUTTON_IDLE = "text-fg-faint hover:text-fg-muted" as const;
