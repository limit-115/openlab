import type { Claim } from "@lab/protocol/schemas";
import { CircleDot } from "lucide-react";
import {
    CLAIM_CELL,
    CLAIM_CELL_ICON,
    CLAIM_IDENTIFIER,
    CLAIM_STATEMENT,
    CLAIMS_TABLE,
    EVIDENCE_COUNT_NEGATIVE,
    EVIDENCE_COUNT_POSITIVE,
    TABLE_CELL,
    TABLE_CELL_NOWRAP,
    TABLE_HEAD_CELL,
    TABLE_ROW,
    TABLE_ROW_STALE,
    TABLE_SCROLL
} from "#src/claims/claims-table.const";
import { StatusTag } from "#src/status-tag/status-tag";
import { formatIdentifier } from "#src/value-display/identifier-display";
import { formatDate } from "#src/value-display/timestamp-display";

interface ClaimsTableProps {
    claims: Claim[];
}

export function ClaimsTable({ claims }: ClaimsTableProps) {
    return (
        <div className={TABLE_SCROLL}>
            <table className={CLAIMS_TABLE}>
                <thead>
                    <tr>
                        <th className={TABLE_HEAD_CELL}>Claim</th>
                        <th className={TABLE_HEAD_CELL}>Status</th>
                        <th className={TABLE_HEAD_CELL}>Evidence</th>
                        <th className={TABLE_HEAD_CELL}>Updated</th>
                    </tr>
                </thead>
                <tbody>
                    {claims.map((claim) => (
                        <tr key={claim.id} className={claim.stale ? TABLE_ROW_STALE : TABLE_ROW}>
                            <td className={TABLE_CELL}>
                                <div className={CLAIM_CELL}>
                                    <CircleDot
                                        size={14}
                                        className={CLAIM_CELL_ICON}
                                        aria-hidden="true"
                                    />
                                    <div className="flex flex-col">
                                        <strong className={CLAIM_STATEMENT}>
                                            {claim.statement}
                                        </strong>
                                        <span className={CLAIM_IDENTIFIER} title={claim.id}>
                                            {formatIdentifier(claim.id)} · {claim.branch_id}
                                            {claim.stale ? " · stale" : ""}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td className={TABLE_CELL}>
                                <StatusTag status={claim.status} />
                            </td>
                            <td className={TABLE_CELL}>
                                <span className={EVIDENCE_COUNT_POSITIVE}>
                                    +{claim.supporting_evidence_ids.length}
                                </span>
                                <span className={EVIDENCE_COUNT_NEGATIVE}>
                                    −{claim.contradicting_evidence_ids.length}
                                </span>
                            </td>
                            <td className={TABLE_CELL_NOWRAP}>{formatDate(claim.updated_at)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
