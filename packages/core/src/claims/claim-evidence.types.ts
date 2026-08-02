import type { Evidence } from "@lab/protocol/schemas";
import type { EvidenceOrigin } from "#src/claims/evidence-origin.const";

export interface AssessedEvidence {
    readonly evidence: Evidence;
    readonly origin: EvidenceOrigin;
    readonly sourceBranchId: string;
    readonly valid: boolean;
    readonly complete: boolean;
    readonly reproducible: boolean;
}
