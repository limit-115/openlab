import {
    SchedulerLane,
    type SchedulerLane as SchedulerLaneValue
} from "@lab/core/scheduling/scheduler-lane.const";
import {
    AgentRole,
    type AgentRole as AgentRoleValue,
    AgentStatus,
    BranchStatus,
    InternalTaskStatus
} from "@lab/protocol/constants";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    createDatabase,
    type Database,
    type DatabaseClient
} from "#src/lab-database/lab-database-client";
import { branches, tasks } from "#src/lab-database/lab-schema";
import { migrateDatabase } from "#src/lab-database/lab-schema-migration";
import { RuntimePersistence } from "#src/runtime/runtime-persistence";
import { makeSnapshot, makeTask, testLabId } from "#src/runtime/runtime-snapshot.fixture";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

const ExpectedAgentRoleLane = {
    [AgentRole.DIRECTOR]: SchedulerLane.EXPLORATION,
    [AgentRole.RESEARCHER]: SchedulerLane.EXPLORATION,
    [AgentRole.CRITIC]: SchedulerLane.ADVERSARIAL,
    [AgentRole.VERIFIER]: SchedulerLane.REPRODUCTION
} as const satisfies Record<AgentRoleValue, SchedulerLaneValue>;

const AdditionalProjectedRole = [
    AgentRole.RESEARCHER,
    AgentRole.CRITIC,
    AgentRole.VERIFIER
] as const;

describeDatabase("Runtime snapshot role lane projection", () => {
    let client: DatabaseClient;
    let persistence: RuntimePersistence;

    beforeAll(async () => {
        if (databaseUrl === undefined) {
            return;
        }
        client = createDatabase(databaseUrl, { max: 2 });
        await migrateDatabase(client.db);
        persistence = new RuntimePersistence(client.db);
    });

    afterAll(async () => {
        await client?.close();
    });

    it("projects task roles into operational lanes and preserves them across recovery", async () => {
        const task = makeTask(testLabId("role-lanes"));
        const snapshot = makeSnapshot(task);
        const directorBranch = snapshot.branches[0];
        const directorTask = snapshot.tasks[0];
        if (directorBranch === undefined || directorTask === undefined) {
            throw new Error("Role lane fixture requires the director branch and task");
        }
        const expected: RoleLaneExpectation[] = [
            {
                branchId: directorBranch.id,
                taskId: directorTask.id,
                role: AgentRole.DIRECTOR,
                lane: ExpectedAgentRoleLane[AgentRole.DIRECTOR]
            }
        ];
        for (const role of AdditionalProjectedRole) {
            const branchId = `${snapshot.lab.id}-branch-${role}`;
            const taskId = `${snapshot.lab.id}-task-${role}`;
            snapshot.branches.push({
                id: branchId,
                title: `${role} branch`,
                approach: `Execute the ${role} stage`,
                status: BranchStatus.ACTIVE,
                progress: "Ready"
            });
            snapshot.agents.push({
                id: `${snapshot.lab.id}-agent-${role}`,
                branch_id: branchId,
                role,
                status: AgentStatus.WORKING,
                current_task_id: taskId
            });
            snapshot.tasks.push({
                id: taskId,
                branch_id: branchId,
                objective: `Execute the ${role} stage`,
                context_refs: [],
                status: InternalTaskStatus.RUNNING,
                attempt: 1,
                role
            });
            expected.push({
                branchId,
                taskId,
                role,
                lane: ExpectedAgentRoleLane[role]
            });
        }
        const emptyBranchId = `${snapshot.lab.id}-branch-empty`;
        snapshot.branches.push({
            id: emptyBranchId,
            title: "Unassigned branch",
            approach: "Await task assignment",
            status: BranchStatus.PAUSED,
            progress: "Unassigned"
        });

        await persistence.initialize({
            task,
            workspacePath: "/tmp/lab-role-lanes",
            snapshot
        });
        await expectProjectedRoleLanes(client.db, snapshot.lab.id, expected, emptyBranchId);

        if (databaseUrl === undefined) {
            throw new Error("TEST_DATABASE_URL is required for this integration test");
        }
        const restartedClient = createDatabase(databaseUrl, { max: 1 });
        try {
            const recovered = await new RuntimePersistence(restartedClient.db).load(
                snapshot.lab.id
            );
            expect(recovered?.checkpoint.snapshot.tasks.map(({ role }) => role)).toEqual(
                expect.arrayContaining(Object.values(AgentRole))
            );
            await expectProjectedRoleLanes(
                restartedClient.db,
                snapshot.lab.id,
                expected,
                emptyBranchId
            );
        } finally {
            await restartedClient.close();
        }
    });
});

interface RoleLaneExpectation {
    readonly branchId: string;
    readonly taskId: string;
    readonly role: AgentRoleValue;
    readonly lane: SchedulerLaneValue;
}

async function expectProjectedRoleLanes(
    database: Database,
    labId: string,
    expected: readonly RoleLaneExpectation[],
    emptyBranchId: string
): Promise<void> {
    const [projectedTasks, projectedBranches] = await Promise.all([
        database.query.tasks.findMany({ where: eq(tasks.labId, labId) }),
        database.query.branches.findMany({ where: eq(branches.labId, labId) })
    ]);
    expect(projectedTasks).toHaveLength(expected.length);
    expect(projectedTasks).toEqual(
        expect.arrayContaining(
            expected.map(({ taskId, role, lane }) =>
                expect.objectContaining({ id: taskId, role, lane })
            )
        )
    );
    expect(projectedBranches).toHaveLength(expected.length + 1);
    expect(projectedBranches).toEqual(
        expect.arrayContaining([
            ...expected.map(({ branchId, lane }) =>
                expect.objectContaining({ id: branchId, lane })
            ),
            expect.objectContaining({
                id: emptyBranchId,
                lane: SchedulerLane.EXPLORATION
            })
        ])
    );
}
