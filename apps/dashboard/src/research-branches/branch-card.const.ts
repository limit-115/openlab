import { BranchStatus } from "@lab/protocol/branches/branch-status.const";

export const BRANCH_LIST = "grid gap-2" as const;

export const BRANCH_CARD =
    "group overflow-hidden rounded-[9px] border border-line bg-[rgba(8,12,10,0.25)]" as const;

export const BRANCH_CARD_SUMMARY =
    "grid min-h-[62px] cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-[11px] px-[13px] py-[10px] hover:bg-[rgba(255,255,255,0.018)] max-[620px]:grid-cols-[auto_minmax(0,1fr)_auto] [&::-webkit-details-marker]:hidden" as const;

export const BRANCH_CARD_STATUS =
    "grid h-[25px] w-[25px] place-items-center rounded-full border" as const;

export const BRANCH_CARD_STATUS_TONE: Record<BranchStatus, string> = {
    [BranchStatus.ACTIVE]: "border-green/22 bg-green/12 text-green",
    [BranchStatus.PAUSED]: "border-amber/20 bg-amber/11 text-amber",
    [BranchStatus.CLOSED]: "border-line text-fg-faint"
};

export const BRANCH_CARD_HEADING = "flex min-w-0 flex-col" as const;

export const BRANCH_CARD_TITLE = "break-words text-sm font-[650]" as const;

export const BRANCH_CARD_APPROACH = "mt-1 break-words text-sm text-fg-muted" as const;

export const BRANCH_CARD_META = "flex gap-[6px] max-[620px]:hidden" as const;

export const BRANCH_CARD_META_ITEM =
    "inline-flex items-center gap-1 rounded-md border border-line px-[6px] py-1 text-sm text-fg-faint" as const;

export const BRANCH_CARD_CHEVRON =
    "text-fg-faint transition-transform duration-[180ms] ease-[ease] group-open:rotate-180 motion-reduce:transition-none" as const;

export const BRANCH_CARD_CONTENT =
    "border-t border-line pr-[13px] pb-[13px] pl-[49px] max-[620px]:pl-[13px]" as const;

export const BRANCH_PROGRESS = "my-3 text-sm leading-[1.5] text-[#c0c9c4]" as const;

export const BRANCH_DETAIL_GRID =
    "grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-5 max-[620px]:grid-cols-1" as const;

export const BRANCH_DETAIL_HEADING =
    "mt-[10px] mb-2 text-sm font-[700] uppercase text-fg-faint" as const;
