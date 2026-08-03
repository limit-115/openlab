import type { Claim } from "@lab/protocol/claims/claim.types";
import type { Experiment } from "@lab/protocol/experiments/experiment.types";
import { ChevronRightIcon } from "lucide-react";
import {
    CLAIM_BALANCE,
    CLAIM_CARD,
    CLAIM_CARD_STALE,
    CLAIM_CONTRADICTING,
    CLAIM_DISCLOSURE,
    CLAIM_DISCLOSURE_BODY,
    CLAIM_DISCLOSURE_CHEVRON,
    CLAIM_DISCLOSURE_LABEL,
    CLAIM_HEADER,
    CLAIM_IDENTIFIERS,
    CLAIM_STATEMENT,
    CLAIM_SUPPORTING,
    CLAIM_TAGS
} from "#src/claims/claim-card.const";
import { ClaimEvidence } from "#src/claims/claim-evidence";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "#src/design-system/collapsible";
import { StatusTag } from "#src/status-tag/status-tag";
import { formatDate } from "#src/value-display/timestamp-display";

interface ClaimCardProps {
    claim: Claim;
    experiments: Experiment[];
}

/**
 * A claim and what it rests on. The evidence is behind a disclosure because it is only fetched when
 * somebody asks for it, and because the statement and its verdict are what the page is scanned for.
 */
export function ClaimCard({ claim, experiments }: ClaimCardProps) {
    const evidenceIds = [...claim.supporting_evidence_ids, ...claim.contradicting_evidence_ids];

    return (
        <Collapsible asChild>
            <li className={cn(CLAIM_CARD, claim.stale && CLAIM_CARD_STALE, "group/claim")}>
                <div className={CLAIM_HEADER}>
                    <strong className={CLAIM_STATEMENT}>{claim.statement}</strong>
                    <span className={CLAIM_TAGS}>
                        {claim.stale ? <Badge variant="warning">Stale</Badge> : null}
                        <StatusTag status={claim.status} />
                    </span>
                </div>

                <p className={CLAIM_BALANCE}>
                    <span className={CLAIM_SUPPORTING}>
                        {claim.supporting_evidence_ids.length} for
                    </span>
                    <span className={CLAIM_CONTRADICTING}>
                        {claim.contradicting_evidence_ids.length} against
                    </span>
                    <span className="text-muted-foreground">
                        Updated {formatDate(claim.updated_at)}
                    </span>
                </p>

                <CollapsibleTrigger className={CLAIM_DISCLOSURE}>
                    <ChevronRightIcon className={CLAIM_DISCLOSURE_CHEVRON} aria-hidden="true" />
                    {CLAIM_DISCLOSURE_LABEL}
                </CollapsibleTrigger>
                <CollapsibleContent className={CLAIM_DISCLOSURE_BODY}>
                    <ClaimEvidence evidenceIds={evidenceIds} experiments={experiments} />
                    <p className={cn(CLAIM_IDENTIFIERS, "pt-3")}>
                        {claim.id} · {claim.branch_id}
                    </p>
                </CollapsibleContent>
            </li>
        </Collapsible>
    );
}
