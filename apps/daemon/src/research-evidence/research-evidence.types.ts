import type { AssessedEvidence } from "@lab/core/claims/claim-evidence.types";
import type { Claim } from "@lab/protocol/claims/claim.types";
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

/**
 * What the daemon can say about the autonomous run that produced an artifact: which run it belongs
 * to, and the harness manifest recording every command the agent issued while producing it.
 */
export interface AgentRunAttestation {
    readonly runId: string;
    readonly manifestPath: string;
    readonly manifestSha256: string;
    readonly manifestBytes: number;
}
