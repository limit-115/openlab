import type { EvidenceOrigin } from "@lab/core/claims/evidence-origin.const";
import type { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";

export interface CreateClaimInput {
    readonly id: string;
    readonly labId: string;
    readonly branchId: string;
    readonly statement: string;
    readonly universal?: boolean;
    readonly dependencyIds?: readonly string[];
    readonly now?: Date;
}

export interface AddEvidenceInput {
    readonly id: string;
    readonly labId: string;
    readonly claimId: string;
    readonly sourceBranchId: string;
    readonly attemptId?: string;
    readonly kind: EvidenceKind;
    readonly origin: EvidenceOrigin;
    readonly fingerprint: string;
    readonly runId?: string;
    readonly artifactPath?: string;
    readonly artifactHash?: string;
    readonly summary: string;
    readonly supports: boolean;
    readonly independent?: boolean;
    readonly valid: boolean;
    readonly complete: boolean;
    readonly reproducible?: boolean;
    readonly now?: Date;
}
