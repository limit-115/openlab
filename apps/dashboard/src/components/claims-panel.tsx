import type { Claim, ClaimStatus } from "@lab/protocol/schemas";
import { CircleDot, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "#src/components/empty-state";
import { Panel } from "#src/components/panel";
import { formatDate, formatIdentifier } from "#src/lib/format";

type ClaimFilter = "all" | "open" | ClaimStatus;

const filters: Array<{ value: ClaimFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "supported", label: "Supported" },
    { value: "reproduced", label: "Reproduced" },
    { value: "refuted", label: "Refuted" }
];

interface ClaimsPanelProps {
    claims: Claim[];
}

export function ClaimsPanel({ claims }: ClaimsPanelProps) {
    const [filter, setFilter] = useState<ClaimFilter>("all");
    const visibleClaims = useMemo(() => {
        if (filter === "all") {
            return claims;
        }
        if (filter === "open") {
            return claims.filter((claim) => ["proposed", "testing"].includes(claim.status));
        }
        return claims.filter((claim) => claim.status === filter);
    }, [claims, filter]);

    return (
        <Panel
            id="evidence"
            title="Claims"
            eyebrow="Evidence ledger"
            icon={ShieldCheck}
            action={
                <fieldset className="filter-group">
                    <legend className="sr-only">Filter claims</legend>
                    {filters.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            className={filter === item.value ? "is-active" : undefined}
                            aria-pressed={filter === item.value}
                            onClick={() => setFilter(item.value)}
                        >
                            {item.label}
                        </button>
                    ))}
                </fieldset>
            }
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
                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Claim</th>
                                <th>Status</th>
                                <th>Evidence</th>
                                <th>Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleClaims.map((claim) => (
                                <tr key={claim.id} className={claim.stale ? "is-stale" : undefined}>
                                    <td>
                                        <div className="claim-cell">
                                            <CircleDot size={14} aria-hidden="true" />
                                            <div>
                                                <strong>{claim.statement}</strong>
                                                <span title={claim.id}>
                                                    {formatIdentifier(claim.id)} · {claim.branch_id}
                                                    {claim.stale ? " · stale" : ""}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`tag tag--${claim.status}`}>
                                            {claim.status}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="evidence-count evidence-count--positive">
                                            +{claim.supporting_evidence_ids.length}
                                        </span>
                                        <span className="evidence-count evidence-count--negative">
                                            −{claim.contradicting_evidence_ids.length}
                                        </span>
                                    </td>
                                    <td className="nowrap">{formatDate(claim.updated_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Panel>
    );
}
