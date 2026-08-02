import type { AssessedEvidence } from "#src/claims/claim-evidence.types";

export function evidenceFingerprint(candidate: AssessedEvidence): string {
    const { evidence } = candidate;
    if (evidence.artifact_hash !== undefined) {
        return `artifact-hash\u0000${evidence.artifact_hash}`;
    }
    if (evidence.run_id !== undefined) {
        return `run\u0000${evidence.run_id}`;
    }
    if (evidence.artifact_path !== undefined) {
        return `artifact-path\u0000${evidence.artifact_path}`;
    }
    return [evidence.kind, evidence.summary, String(evidence.supports)].join("\u0000");
}

export function deduplicateEvidence(evidence: readonly AssessedEvidence[]): AssessedEvidence[] {
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();

    return evidence.filter((candidate) => {
        const fingerprint = evidenceFingerprint(candidate);
        if (seenIds.has(candidate.evidence.id) || seenFingerprints.has(fingerprint)) {
            return false;
        }

        seenIds.add(candidate.evidence.id);
        seenFingerprints.add(fingerprint);
        return true;
    });
}

export function isUsableEvidence(candidate: AssessedEvidence): boolean {
    return candidate.valid && candidate.complete;
}

export function isSupportingEvidence(candidate: AssessedEvidence): boolean {
    return isUsableEvidence(candidate) && candidate.evidence.supports;
}

export function isContradictingEvidence(candidate: AssessedEvidence): boolean {
    return isUsableEvidence(candidate) && !candidate.evidence.supports;
}
