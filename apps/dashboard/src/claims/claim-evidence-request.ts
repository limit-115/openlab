import { EvidenceSchema } from "@lab/protocol/evidence/evidence.schema";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";

export function evidenceQueryKey(id: string): readonly string[] {
    return ["lab", "evidence", id];
}

/**
 * Evidence is not carried by the status snapshot, only referenced by id, so a claim fetches the
 * records behind it the moment somebody opens it and not before.
 */
export async function fetchEvidence(id: string, signal?: AbortSignal): Promise<Evidence> {
    const response = await fetch(`/api/inspect/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });

    if (!response.ok) {
        throw new Error(`The runtime has no record for evidence ${id}.`);
    }

    return EvidenceSchema.parse(await response.json());
}
