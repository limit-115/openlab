import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { and, eq, notInArray } from "drizzle-orm";
import { findings } from "#src/lab-database/lab-schema";
import { assertUpserted } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

export async function upsertFindings(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    for (const finding of snapshot.findings) {
        const mutable = {
            claim: finding.claim,
            work: finding.work,
            artifactPaths: [...finding.artifact_paths],
            status: finding.status
        };
        const records = await database
            .insert(findings)
            .values({
                id: finding.id,
                investigationId: snapshot.investigation.id,
                leadId: finding.lead_id,
                runId: finding.run_id,
                ...mutable,
                createdAt: new Date(finding.created_at)
            })
            .onConflictDoUpdate({
                target: findings.id,
                set: mutable,
                setWhere: eq(findings.investigationId, snapshot.investigation.id)
            })
            .returning({ id: findings.id });
        assertUpserted(records, "finding", finding.id);
    }
}

export async function deleteMissingFindings(
    database: RuntimeProjectionDatabase,
    investigationId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(findings)
        .where(
            ids.length === 0
                ? eq(findings.investigationId, investigationId)
                : and(eq(findings.investigationId, investigationId), notInArray(findings.id, ids))
        );
}
