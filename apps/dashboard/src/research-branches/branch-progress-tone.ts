import { BranchProgress } from "@lab/protocol/branches/branch-progress.const";
import { domainValues } from "@lab/protocol/finite-domain/finite-domain-values";
import {
    BRANCH_PROGRESS_REASON_TONE,
    BRANCH_PROGRESS_TONE
} from "#src/research-branches/branch-progress-tone.const";
import type { BadgeVariant } from "#src/status-tag/status-tag.types";

/** Reads progress as a status when the daemon wrote one of its own words, and as a reason if not. */
export function branchProgressTone(progress: string): BadgeVariant {
    const known = domainValues(BranchProgress).find((value) => value === progress);

    return known === undefined ? BRANCH_PROGRESS_REASON_TONE : BRANCH_PROGRESS_TONE[known];
}
