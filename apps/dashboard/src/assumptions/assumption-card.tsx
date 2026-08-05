import type { Assumption } from "@openlab/protocol/assumptions/assumption.types";
import { AssumptionStatus } from "@openlab/protocol/assumptions/assumption-status.const";
import type { Finding } from "@openlab/protocol/findings/finding.types";
import type { Verdict } from "@openlab/protocol/verdicts/verdict.types";
import {
    ASSUMPTION_CARD,
    ASSUMPTION_CARD_CONFIRMED,
    ASSUMPTION_HEADER,
    ASSUMPTION_META,
    ASSUMPTION_OUTCOME,
    ASSUMPTION_RATIONALE,
    ASSUMPTION_STATEMENT,
    ASSUMPTION_TAGS,
    FINDING_LIST
} from "#src/assumptions/assumption-card.const";
import { FindingEntry } from "#src/assumptions/finding-entry";
import { cn } from "#src/design-system/class-names";
import { StatusTag } from "#src/status-tag/status-tag";
import { formatDate } from "#src/value-display/timestamp-display";

interface AssumptionCardProps {
    assumption: Assumption;
    findings: Finding[];
    verdicts: Verdict[];
}

/** One bet the director placed: why it was worth taking, and what came back from taking it. */
export function AssumptionCard({ assumption, findings, verdicts }: AssumptionCardProps) {
    const confirmed = assumption.status === AssumptionStatus.CONFIRMED;

    return (
        <li className={cn(ASSUMPTION_CARD, confirmed && ASSUMPTION_CARD_CONFIRMED)}>
            <div className={ASSUMPTION_HEADER}>
                <strong className={ASSUMPTION_STATEMENT}>{assumption.statement}</strong>
                <span className={ASSUMPTION_TAGS}>
                    <StatusTag status={assumption.status} />
                </span>
            </div>

            <p className={ASSUMPTION_RATIONALE}>{assumption.rationale}</p>
            {assumption.outcome ? <p className={ASSUMPTION_OUTCOME}>{assumption.outcome}</p> : null}

            <p className={ASSUMPTION_META}>
                <span>Round {assumption.cycle + 1}</span>
                <span>Updated {formatDate(assumption.updated_at)}</span>
            </p>

            {findings.length > 0 ? (
                <ul className={FINDING_LIST}>
                    {findings.map((finding) => (
                        <FindingEntry
                            key={finding.id}
                            finding={finding}
                            verdict={verdicts.find(({ finding_id }) => finding_id === finding.id)}
                        />
                    ))}
                </ul>
            ) : null}
        </li>
    );
}
