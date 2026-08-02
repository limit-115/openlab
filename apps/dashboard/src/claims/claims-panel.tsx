import { ClaimStatus } from "@lab/protocol/constants";
import type { Claim } from "@lab/protocol/schemas";
import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { ClaimFilterGroup } from "#src/claims/claim-filter";
import { ClaimFilter } from "#src/claims/claim-filter.const";
import { ClaimsTable } from "#src/claims/claims-table";
import { Panel } from "#src/panel/panel";
import { EmptyState } from "#src/panel/panel-empty-state";

interface ClaimsPanelProps {
    claims: Claim[];
}

export function ClaimsPanel({ claims }: ClaimsPanelProps) {
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
            id="evidence"
            title="Claims"
            eyebrow="Evidence ledger"
            icon={ShieldCheck}
            action={<ClaimFilterGroup filter={filter} onSelect={setFilter} />}
        >
            {claims.length === 0 ? (
                <EmptyState
                    title="No claims recorded"
                    description="Testable claims will appear after the research goal is operationalized."
                />
            ) : visibleClaims.length === 0 ? (
                <EmptyState
                    compact
                    title="No matching claims"
                    description="Select another evidence status."
                />
            ) : (
                <ClaimsTable claims={visibleClaims} />
            )}
        </Panel>
    );
}
