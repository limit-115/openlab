import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import type { BadgeVariant } from "#src/status-tag/status-tag.types";

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

export const BRANCH_CARD_META = "flex flex-wrap items-center justify-end gap-2" as const;

/** The counts only qualify the status beside them, so a narrow screen drops them and keeps it. */
export const BRANCH_CARD_COUNTS = "hidden items-center gap-2 sm:flex" as const;

/**
 * How far the direction has got is usually a single word, but a paused one carries the whole reason
 * it stopped, so the badge wraps to fit rather than cutting a sentence off where it cannot be read.
 */
export const BRANCH_PROGRESS = "h-auto max-w-48 whitespace-normal" as const;

/** Progress reads as loudly as the direction it belongs to, not as the words it happens to use. */
export const BRANCH_PROGRESS_TONE: Record<BranchStatus, BadgeVariant> = {
    [BranchStatus.ACTIVE]: "default",
    [BranchStatus.PAUSED]: "outline",
    [BranchStatus.CLOSED]: "secondary"
};
