import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import type { Experiment } from "@lab/protocol/experiments/experiment.types";
import {
    EVIDENCE_ARTIFACT,
    EVIDENCE_BODY,
    EVIDENCE_COMMAND,
    EVIDENCE_ENTRY,
    EVIDENCE_KIND_LABEL,
    EVIDENCE_MARK,
    EVIDENCE_MARK_TONE,
    EVIDENCE_RUN,
    EVIDENCE_SUMMARY,
    EVIDENCE_TAGS,
    INDEPENDENT_LABEL
} from "#src/claims/claim-evidence.const";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { experimentDuration } from "#src/experiments/experiment-duration";
import { StatusTag } from "#src/status-tag/status-tag";

interface EvidenceEntryProps {
    evidence: Evidence;
    /** The run named by this evidence, when the snapshot still carries it. */
    experiment: Experiment | undefined;
}

/** One record behind a claim, together with the run that produced it. */
export function EvidenceEntry({ evidence, experiment }: EvidenceEntryProps) {
    return (
        <li className={EVIDENCE_ENTRY}>
            <span
                className={cn(
                    EVIDENCE_MARK,
                    evidence.supports
                        ? EVIDENCE_MARK_TONE.supporting
                        : EVIDENCE_MARK_TONE.contradicting
                )}
                aria-hidden="true"
            >
                {evidence.supports ? "+" : "−"}
            </span>

            <div className={EVIDENCE_BODY}>
                <p className={EVIDENCE_SUMMARY}>{evidence.summary}</p>

                <div className={EVIDENCE_TAGS}>
                    <Badge variant="outline">{EVIDENCE_KIND_LABEL[evidence.kind]}</Badge>
                    {evidence.independent ? <Badge>{INDEPENDENT_LABEL}</Badge> : null}
                    {experiment ? <StatusTag status={experiment.status} /> : null}
                </div>

                {experiment ? (
                    <>
                        <p className={EVIDENCE_COMMAND}>{experiment.command}</p>
                        <p className={EVIDENCE_RUN}>
                            <span>Exit {experiment.exit_code ?? "—"}</span>
                            <span>{experimentDuration(experiment)}</span>
                            <span>{experiment.evaluator}</span>
                        </p>
                        {experiment.error === undefined ? null : (
                            <p className="text-sm break-words text-destructive">
                                {experiment.error}
                            </p>
                        )}
                    </>
                ) : null}

                {evidence.artifact_path === undefined ? null : (
                    <p className={EVIDENCE_ARTIFACT}>{evidence.artifact_path}</p>
                )}
                {evidence.artifact_hash === undefined ? null : (
                    <p className={EVIDENCE_ARTIFACT}>sha256 {evidence.artifact_hash}</p>
                )}
                {evidence.source === undefined ? null : (
                    <p className={EVIDENCE_ARTIFACT}>
                        {evidence.source.title} · {evidence.source.claimed_classification} ·{" "}
                        {evidence.source.final_url}
                    </p>
                )}
            </div>
        </li>
    );
}
