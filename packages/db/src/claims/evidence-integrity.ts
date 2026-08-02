import type { AddEvidenceInput } from "#src/claims/claim-repository.types";

export function assertEvidenceIntegrity(input: AddEvidenceInput): void {
    if (input.fingerprint.trim().length === 0) {
        throw new Error("Evidence fingerprint must not be empty");
    }
    if (input.summary.trim().length === 0) {
        throw new Error("Evidence summary must not be empty");
    }
    const hasArtifactPath = input.artifactPath !== undefined;
    const hasArtifactHash = input.artifactHash !== undefined;
    if (hasArtifactPath !== hasArtifactHash) {
        throw new Error("Evidence artifact path and hash must be recorded together");
    }
    if (input.artifactPath !== undefined && input.artifactPath.trim().length === 0) {
        throw new Error("Evidence artifact path must not be empty");
    }
    if (input.artifactHash !== undefined && input.artifactHash.trim().length === 0) {
        throw new Error("Evidence artifact hash must not be empty");
    }
}
