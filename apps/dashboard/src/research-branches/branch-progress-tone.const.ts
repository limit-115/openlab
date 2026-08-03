import { BranchProgress } from "@lab/protocol/branches/branch-progress.const";
import type { BadgeVariant } from "#src/status-tag/status-tag.types";

/** What a direction has got to, in the four colours every other status on the page is read in. */
export const BRANCH_PROGRESS_TONE: Record<BranchProgress, BadgeVariant> = {
    [BranchProgress.QUEUED]: "warning",
    [BranchProgress.RUNNING]: "default",
    [BranchProgress.FINISHED]: "success",
    [BranchProgress.FAILED]: "destructive",
    [BranchProgress.CANCELLED]: "destructive",
    [BranchProgress.CAPABILITY_BLOCKED]: "warning"
};

/**
 * A branch stopped from outside the research cycle carries the reason instead of a progress word.
 * Whatever that sentence says, the direction is not moving, so it reads as something to look at.
 */
export const BRANCH_PROGRESS_REASON_TONE: BadgeVariant = "warning";
