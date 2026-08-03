import { BranchStatus } from "@lab/protocol/branches/branch-status.const";

export const BRANCH_LIST = "grid list-none gap-3" as const;

export const BRANCH_CARD = "overflow-hidden rounded-2xl border" as const;

export const BRANCH_CARD_SUMMARY = "flex w-full items-center gap-3 p-4 text-left" as const;

export const BRANCH_CARD_STATUS =
    "grid size-7 flex-none place-items-center rounded-full border" as const;

export const BRANCH_CARD_STATUS_TONE: Record<BranchStatus, string> = {
    [BranchStatus.ACTIVE]: "border-primary/40 bg-primary/10 text-primary",
    [BranchStatus.PAUSED]: "border-border bg-muted text-muted-foreground",
    [BranchStatus.CLOSED]: "border-border text-muted-foreground"
};

export const BRANCH_CARD_TITLE = "text-base font-medium break-words" as const;

export const BRANCH_CARD_APPROACH = "text-sm break-words text-muted-foreground" as const;

export const BRANCH_CARD_META = "hidden items-center gap-2 sm:flex" as const;

/** What the direction has actually produced, which is the reason the card is read at all. */
export const BRANCH_PROGRESS = "border-t p-4 text-sm leading-relaxed" as const;
