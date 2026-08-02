import { createHash } from "node:crypto";
import type { Evidence } from "@lab/protocol/schemas";

export function evidenceFingerprint(candidate: Evidence): string {
    const serialized = JSON.stringify([
        candidate.claim_id,
        candidate.kind,
        candidate.run_id ?? null,
        candidate.artifact_hash ?? null,
        candidate.supports,
        candidate.independent
    ]);
    return createHash("sha256").update(serialized).digest("hex");
}

export function assertUniqueEvidenceFingerprints(evidenceRecords: readonly Evidence[]): void {
    const evidenceByFingerprint = new Map<string, string>();
    for (const candidate of evidenceRecords) {
        const fingerprint = evidenceFingerprint(candidate);
        const existingId = evidenceByFingerprint.get(fingerprint);
        if (existingId !== undefined) {
            throw new Error(`Evidence ${candidate.id} duplicates semantic evidence ${existingId}`);
        }
        evidenceByFingerprint.set(fingerprint, candidate.id);
    }
}
