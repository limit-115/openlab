import type { Claim } from "@lab/protocol/claims/claim.types";
import { CircleDotIcon } from "lucide-react";
import {
    CLAIM_CELL,
    CLAIM_IDENTIFIER,
    CLAIM_ROW_STALE,
    CLAIM_STATEMENT,
    CLAIMS_TABLE,
    EVIDENCE_COUNTS
} from "#src/claims/claims-table.const";
import { cn } from "#src/design-system/class-names";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "#src/design-system/table";
import { StatusTag } from "#src/status-tag/status-tag";
import { formatDate } from "#src/value-display/timestamp-display";

interface ClaimsTableProps {
    claims: Claim[];
}

export function ClaimsTable({ claims }: ClaimsTableProps) {
    return (
        <Table className={CLAIMS_TABLE}>
            <TableHeader>
                <TableRow>
                    <TableHead className="pl-6">Claim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead className="pr-6">Updated</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {claims.map((claim) => (
                    <TableRow key={claim.id} className={cn(claim.stale && CLAIM_ROW_STALE)}>
                        <TableCell className="pl-6 whitespace-normal">
                            <div className={CLAIM_CELL}>
                                <CircleDotIcon
                                    className="mt-0.5 size-4 flex-none text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <div className="flex flex-col gap-1">
                                    <strong className={CLAIM_STATEMENT}>{claim.statement}</strong>
                                    <span className={CLAIM_IDENTIFIER}>
                                        {claim.id} · {claim.branch_id}
                                        {claim.stale ? " · stale" : ""}
                                    </span>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <StatusTag status={claim.status} />
                        </TableCell>
                        <TableCell>
                            <span className={EVIDENCE_COUNTS}>
                                <span className="text-primary">
                                    +{claim.supporting_evidence_ids.length}
                                </span>
                                <span className="text-destructive">
                                    −{claim.contradicting_evidence_ids.length}
                                </span>
                            </span>
                        </TableCell>
                        <TableCell className="pr-6 text-muted-foreground">
                            {formatDate(claim.updated_at)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
