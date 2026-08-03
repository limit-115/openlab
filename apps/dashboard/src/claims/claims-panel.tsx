import type { Claim } from "@lab/protocol/claims/claim.types";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import type { Experiment } from "@lab/protocol/experiments/experiment.types";
import { useMemo, useState } from "react";
import { ClaimCard } from "#src/claims/claim-card";
import { CLAIM_LIST } from "#src/claims/claim-card.const";
import { ClaimFilterGroup } from "#src/claims/claim-filter";
import { ClaimFilter } from "#src/claims/claim-filter.const";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

interface ClaimsPanelProps {
    claims: Claim[];
    /** The runs a claim's evidence points at, so opening one does not need a second request. */
    experiments: Experiment[];
}

export function ClaimsPanel({ claims, experiments }: ClaimsPanelProps) {
    const [filter, setFilter] = useState<ClaimFilter>(ClaimFilter.ALL);
    const visibleClaims = useMemo(() => {
        if (filter === ClaimFilter.ALL) {
            return claims;
        }
        if (filter === ClaimFilter.OPEN) {
            return claims.filter(
                (claim) =>
                    claim.status === ClaimStatus.PROPOSED || claim.status === ClaimStatus.TESTING
            );
        }
        return claims.filter((claim) => claim.status === filter);
    }, [claims, filter]);

    return (
        <Panel
            title="Claims"
            description="Evidence ledger"
            action={<ClaimFilterGroup filter={filter} onSelect={setFilter} />}
        >
            {claims.length === 0 ? (
                <PanelEmptyState
                    title="No claims recorded"
                    description="Testable claims will appear after the research goal is operationalized."
                />
            ) : visibleClaims.length === 0 ? (
                <PanelEmptyState
                    compact
                    title="No matching claims"
                    description="Select another evidence status."
                />
            ) : (
                <ul className={CLAIM_LIST}>
                    {visibleClaims.map((claim) => (
                        <ClaimCard key={claim.id} claim={claim} experiments={experiments} />
                    ))}
                </ul>
            )}
        </Panel>
    );
}
