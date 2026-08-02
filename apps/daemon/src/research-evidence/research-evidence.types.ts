import type { AssessedEvidence } from "@lab/core/claims/claim-evidence.types";
import type { Claim } from "@lab/protocol/schemas";
import type { ResearchResult } from "#src/research-contract/research-contract";
import type { ResearchTargetKind } from "#src/research-contract/research-contract.const";

export interface PlanTarget {
    readonly claim: Claim;
    readonly evaluator: string;
    readonly kind: ResearchTargetKind;
    readonly planIndex: number;
}

export interface MaterialEvidence {
    readonly assessed: AssessedEvidence;
    readonly claimId: string;
    readonly outcome: ResearchResult["outcome"];
}
