import type { Claim } from "@lab/protocol/claims/claim.types";
import type { ResearchTargetKind } from "#src/research-contract/research-contract.const";

export interface EvaluatorTarget {
    readonly kind: ResearchTargetKind;
    readonly index: number;
    readonly claim: Claim;
}

export interface FrozenEvaluator {
    readonly targetKind: ResearchTargetKind;
    readonly targetIndex: number;
    readonly targetClaimId: string;
    readonly targetStatementSha256: string;
    readonly file: string;
    readonly fileSha256: string;
    readonly args: readonly string[];
    readonly successContract: string;
}

export interface EvaluatorInputArtifact {
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
}

export interface BoundEvaluatorInput {
    readonly serialized: string;
    readonly bindingSha256: string;
    readonly artifactSha256s: readonly string[];
}
