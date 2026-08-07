import type { Finding } from "@openlab/protocol/findings/finding.types";
import type { Lead } from "@openlab/protocol/leads/lead.types";
import { LeadStatus } from "@openlab/protocol/leads/lead-status.const";
import type { Verdict } from "@openlab/protocol/verdicts/verdict.types";
import { cn } from "#src/design-system/class-names";
import { FindingEntry } from "#src/leads/finding-entry";
import {
    FINDING_LIST,
    LEAD_CARD,
    LEAD_CARD_CONFIRMED,
    LEAD_HEADER,
    LEAD_META,
    LEAD_OUTCOME,
    LEAD_RATIONALE,
    LEAD_STATEMENT,
    LEAD_TAGS
} from "#src/leads/lead-card.const";
import { StatusTag } from "#src/status-tag/status-tag";
import { formatDate } from "#src/value-display/timestamp-display";

interface LeadCardProps {
    lead: Lead;
    findings: Finding[];
    verdicts: Verdict[];
}

/** One lead the director placed: why it was worth taking, and what came back from taking it. */
export function LeadCard({ lead, findings, verdicts }: LeadCardProps) {
    const confirmed = lead.status === LeadStatus.CONFIRMED;

    return (
        <li className={cn(LEAD_CARD, confirmed && LEAD_CARD_CONFIRMED)}>
            <div className={LEAD_HEADER}>
                <strong className={LEAD_STATEMENT}>{lead.statement}</strong>
                <span className={LEAD_TAGS}>
                    <StatusTag status={lead.status} />
                </span>
            </div>

            <p className={LEAD_RATIONALE}>{lead.rationale}</p>
            {lead.outcome ? <p className={LEAD_OUTCOME}>{lead.outcome}</p> : null}

            <p className={LEAD_META}>
                <span>Round {lead.cycle + 1}</span>
                <span>Updated {formatDate(lead.updated_at)}</span>
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
