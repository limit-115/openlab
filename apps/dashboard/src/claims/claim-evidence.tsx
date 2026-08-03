import type { Experiment } from "@lab/protocol/experiments/experiment.types";
import { useQueries } from "@tanstack/react-query";
import {
    EVIDENCE_LIST,
    EVIDENCE_LOADING,
    EVIDENCE_MISSING,
    EVIDENCE_PENDING,
    NO_EVIDENCE
} from "#src/claims/claim-evidence.const";
import { evidenceQueryKey, fetchEvidence } from "#src/claims/claim-evidence-request";
import { EvidenceEntry } from "#src/claims/evidence-entry";
import { Spinner } from "#src/design-system/spinner";

interface ClaimEvidenceProps {
    evidenceIds: string[];
    experiments: Experiment[];
}

/**
 * The records a claim rests on. They are fetched by id rather than read from the snapshot, and a
 * recorded piece of evidence never changes, so each one is read once and kept.
 */
export function ClaimEvidence({ evidenceIds, experiments }: ClaimEvidenceProps) {
    const records = useQueries({
        queries: evidenceIds.map((id) => ({
            queryKey: evidenceQueryKey(id),
            queryFn: ({ signal }: { signal: AbortSignal }) => fetchEvidence(id, signal),
            staleTime: Number.POSITIVE_INFINITY
        }))
    });

    if (evidenceIds.length === 0) {
        return <p className={EVIDENCE_MISSING}>{NO_EVIDENCE}</p>;
    }

    if (records.some((record) => record.isPending)) {
        return (
            <p className={EVIDENCE_PENDING}>
                <Spinner className="size-4" />
                {EVIDENCE_LOADING}
            </p>
        );
    }

    return (
        <ul className={EVIDENCE_LIST}>
            {records.map((record, index) => {
                const id = evidenceIds[index] ?? "";
                if (record.data === undefined) {
                    return (
                        <li key={id} className={EVIDENCE_MISSING}>
                            {record.error instanceof Error
                                ? record.error.message
                                : `The runtime has no record for evidence ${id}.`}
                        </li>
                    );
                }

                return (
                    <EvidenceEntry
                        key={id}
                        evidence={record.data}
                        experiment={experiments.find(
                            (experiment) => experiment.id === record.data.run_id
                        )}
                    />
                );
            })}
        </ul>
    );
}
