import { BranchStatus } from "@lab/protocol/branches/branch-status.const";

export const BRANCH_LIST = "grid list-none gap-3" as const;

export const BRANCH_CARD = "overflow-hidden rounded-2xl border" as const;

export const BRANCH_CARD_SUMMARY =
    "group flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 motion-reduce:transition-none" as const;

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

export const BRANCH_CARD_CHEVRON =
    "size-4 flex-none text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" as const;

export const BRANCH_CARD_CONTENT = "border-t p-4" as const;

export const BRANCH_PROGRESS = "mb-4 text-sm leading-relaxed" as const;

export const BRANCH_DETAIL_GRID = "grid gap-6 lg:grid-cols-2" as const;

export const BRANCH_DETAIL_HEADING = "mb-3 text-sm font-medium text-muted-foreground" as const;
