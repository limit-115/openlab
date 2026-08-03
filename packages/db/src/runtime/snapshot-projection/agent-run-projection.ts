import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { and, eq, notInArray } from "drizzle-orm";
import { agentRuns } from "#src/lab-database/lab-schema";
import { assertUpserted } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

export async function upsertAgentRuns(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    projectionAt: Date
): Promise<void> {
    for (const run of snapshot.runs) {
        const mutable = {
            assumptionId: run.assumption_id ?? null,
            role: run.role,
            objective: run.objective,
            status: run.status,
            harness: run.execution?.harness ?? null,
            model: run.execution?.model ?? null,
            effort: run.execution?.effort ?? null,
            cwd: run.cwd,
            exitCode: run.exit_code ?? null,
            error: run.error ?? null,
            manifestPath: run.manifest_path ?? null,
            finishedAt: run.finished_at === undefined ? null : new Date(run.finished_at)
        };
        const records = await database
            .insert(agentRuns)
            .values({
                id: run.id,
                labId: snapshot.lab.id,
                ...mutable,
                startedAt: new Date(run.started_at),
                createdAt: new Date(run.started_at),
                updatedAt: projectionAt
            })
            .onConflictDoUpdate({
                target: agentRuns.id,
                set: { ...mutable, updatedAt: projectionAt },
                setWhere: eq(agentRuns.labId, snapshot.lab.id)
            })
            .returning({ id: agentRuns.id });
        assertUpserted(records, "agent run", run.id);
    }
}

export async function deleteMissingAgentRuns(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(agentRuns)
        .where(
            ids.length === 0
                ? eq(agentRuns.labId, labId)
                : and(eq(agentRuns.labId, labId), notInArray(agentRuns.id, ids))
        );
}
