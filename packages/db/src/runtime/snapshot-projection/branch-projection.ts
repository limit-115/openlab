import type { SchedulerLane as SchedulerLaneValue } from "@lab/core/scheduling/scheduler-lane.const";
import type { StatusSnapshot } from "@lab/protocol/status";
import { and, eq, notInArray } from "drizzle-orm";
import { branches } from "#src/lab-database/lab-schema";
import { AgentRoleSchedulerLane } from "#src/runtime/snapshot-projection/agent-role-scheduler-lane.const";
import { BranchProjectionDefault } from "#src/runtime/snapshot-projection/branch-projection.const";
import { assertUpserted } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

export async function upsertBranches(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    projectionAt: Date
): Promise<void> {
    for (const branch of snapshot.branches) {
        const lane = branchSchedulerLane(snapshot, branch.id);
        const records = await database
            .insert(branches)
            .values({
                id: branch.id,
                labId: snapshot.lab.id,
                title: branch.title,
                approach: branch.approach,
                status: branch.status,
                lane,
                createdAt: projectionAt,
                updatedAt: projectionAt
            })
            .onConflictDoUpdate({
                target: branches.id,
                set: {
                    title: branch.title,
                    approach: branch.approach,
                    status: branch.status,
                    lane,
                    updatedAt: projectionAt
                },
                setWhere: eq(branches.labId, snapshot.lab.id)
            })
            .returning({ id: branches.id });
        assertUpserted(records, "branch", branch.id);
    }
}

export async function deleteMissingBranches(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(branches)
        .where(
            ids.length === 0
                ? eq(branches.labId, labId)
                : and(eq(branches.labId, labId), notInArray(branches.id, ids))
        );
}

function branchSchedulerLane(snapshot: StatusSnapshot, branchId: string): SchedulerLaneValue {
    const taskLanes = new Set(
        snapshot.tasks
            .filter((task) => task.branch_id === branchId)
            .map((task) => AgentRoleSchedulerLane[task.role])
    );
    const [lane, conflictingLane] = taskLanes;
    if (lane === undefined) {
        return BranchProjectionDefault.EMPTY_BRANCH_LANE;
    }
    if (conflictingLane !== undefined) {
        throw new Error(`Branch ${branchId} contains tasks from multiple scheduler lanes`);
    }
    return lane;
}
