import type { Claim } from "@lab/protocol/claims/claim.types";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import { ShieldCheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { ClaimFilterGroup } from "#src/claims/claim-filter";
import { ClaimFilter } from "#src/claims/claim-filter.const";
import { ClaimsTable } from "#src/claims/claims-table";
import { CLAIMS_TABLE_BODY } from "#src/claims/claims-table.const";
import { cn } from "#src/design-system/class-names";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

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

    const hasTable = claims.length > 0 && visibleClaims.length > 0;

    return (
        <Panel
            title="Claims"
            description="Evidence ledger"
            icon={ShieldCheckIcon}
            action={<ClaimFilterGroup filter={filter} onSelect={setFilter} />}
            contentClassName={cn(hasTable && CLAIMS_TABLE_BODY)}
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
                <ClaimsTable claims={visibleClaims} />
            )}
        </Panel>
    );
}
