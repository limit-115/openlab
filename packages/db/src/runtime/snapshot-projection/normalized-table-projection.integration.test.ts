import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { AssumptionStatus } from "@lab/protocol/assumptions/assumption-status.const";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@lab/protocol/findings/finding-status.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseClient } from "#src/lab-database/lab-database-client";
import {
    agentRuns,
    assumptions,
    capabilityRequests,
    findings,
    verdicts
} from "#src/lab-database/lab-schema";
import { migrateDatabase } from "#src/lab-database/lab-schema-migration";
import { RuntimePersistence } from "#src/runtime/runtime-persistence";
import {
    makeEvent,
    makeSnapshot,
    makeTask,
    testEventId,
    testLabId
} from "#src/runtime/runtime-snapshot.fixture";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

describeDatabase("Runtime snapshot normalized table projection", () => {
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

    it("projects checkpoint state into normalized tables and removes stale rows", async () => {
        const task = makeTask(testLabId("projection"));
        const snapshot = makeSnapshot(task);
        const abandonedAssumptionId = `${snapshot.lab.id}-assumption-abandoned`;
        snapshot.assumptions.push({
            id: abandonedAssumptionId,
            cycle: 0,
            statement: "The bottleneck is lock contention",
            rationale: "The profile shows time in the scheduler",
            status: AssumptionStatus.OPEN,
            created_at: snapshot.lab.started_at,
            updated_at: snapshot.lab.updated_at
        });

        await persistence.initialize({
            task,
            workspacePath: "/tmp/lab-runtime-projection",
            snapshot
        });

        expect(
            await client.db.query.assumptions.findMany({
                where: eq(assumptions.labId, snapshot.lab.id)
            })
        ).toHaveLength(2);
        expect(
            await client.db.query.agentRuns.findMany({
                where: eq(agentRuns.labId, snapshot.lab.id)
            })
        ).toHaveLength(3);
        expect(
            await client.db.query.findings.findFirst({
                where: eq(findings.labId, snapshot.lab.id)
            })
        ).toEqual(
            expect.objectContaining({
                id: snapshot.findings[0]?.id,
                status: FindingStatus.UNVERIFIED,
                artifactPaths: ["artifacts/bench.json"]
            })
        );

        const updated = structuredClone(snapshot);
        updated.lab.updated_at = "2026-08-02T00:10:00.000Z";
        updated.assumptions = updated.assumptions.filter(({ id }) => id !== abandonedAssumptionId);
        const researchedAssumption = updated.assumptions[0];
        const finding = updated.findings[0];
        const verifierRun = updated.runs[2];
        const capability = updated.capability_requests[0];
        if (
            researchedAssumption === undefined ||
            finding === undefined ||
            verifierRun === undefined ||
            capability === undefined
        ) {
            throw new Error(
                "Projection fixture must carry an assumption, finding, run and request"
            );
        }
        finding.status = FindingStatus.CONFIRMED;
        researchedAssumption.status = AssumptionStatus.CONFIRMED;
        researchedAssumption.updated_at = updated.lab.updated_at;
        verifierRun.status = AgentRunStatus.SUCCEEDED;
        verifierRun.finished_at = updated.lab.updated_at;
        updated.verdicts = [
            {
                id: `${updated.lab.id}-verdict-primary`,
                finding_id: finding.id,
                run_id: verifierRun.id,
                confirmed: true,
                reasoning: "Rebuilt the workload from scratch and the stall disappeared as claimed",
                created_at: updated.lab.updated_at
            }
        ];
        updated.breakthrough_finding_id = finding.id;
        capability.status = CapabilityStatus.ANSWERED;
        capability.answer = "Not reserving a host for this; pin the cores and report the variance";
        capability.answered_at = updated.lab.updated_at;

        const committed = await persistence.commit({ snapshot: updated, expectedRevision: 1 });
        expect(committed.revision).toBe(2);
        expect(
            await client.db.query.assumptions.findMany({
                where: eq(assumptions.labId, snapshot.lab.id)
            })
        ).toHaveLength(1);
        expect(
            await client.db.query.findings.findFirst({ where: eq(findings.id, finding.id) })
        ).toEqual(expect.objectContaining({ status: FindingStatus.CONFIRMED }));
        expect(
            await client.db.query.verdicts.findFirst({ where: eq(verdicts.findingId, finding.id) })
        ).toEqual(expect.objectContaining({ confirmed: true }));
        expect(
            await client.db.query.agentRuns.findFirst({ where: eq(agentRuns.id, verifierRun.id) })
        ).toEqual(
            expect.objectContaining({
                status: AgentRunStatus.SUCCEEDED,
                finishedAt: new Date(updated.lab.updated_at)
            })
        );
        expect(
            await client.db.query.capabilityRequests.findFirst({
                where: eq(capabilityRequests.id, capability.id)
            })
        ).toEqual(
            expect.objectContaining({
                status: CapabilityStatus.ANSWERED,
                answer: capability.answer,
                answeredAt: new Date(updated.lab.updated_at)
            })
        );

        const invalid = structuredClone(updated);
        const orphanedFinding = invalid.findings[0];
        if (orphanedFinding === undefined) {
            throw new Error("Projection fixture must carry a finding");
        }
        orphanedFinding.assumption_id = `${snapshot.lab.id}-missing-assumption`;
        orphanedFinding.status = FindingStatus.REFUTED;
        invalid.lab.updated_at = "2026-08-02T00:11:00.000Z";
        await expect(
            persistence.commit({
                snapshot: invalid,
                expectedRevision: 2,
                event: makeEvent(
                    EventType.FINDING_REFUTED,
                    snapshot.lab.id,
                    "event-invalid-projection",
                    invalid.lab.updated_at
                )
            })
        ).rejects.toThrow(`references missing assumption ${orphanedFinding.assumption_id}`);

        expect((await persistence.load(snapshot.lab.id))?.checkpoint.revision).toBe(2);
        expect(
            await client.db.query.findings.findFirst({ where: eq(findings.id, finding.id) })
        ).toEqual(expect.objectContaining({ status: FindingStatus.CONFIRMED }));
        expect((await persistence.eventsAfter(snapshot.lab.id)).map(({ id }) => id)).not.toContain(
            testEventId(snapshot.lab.id, "event-invalid-projection")
        );
    });
});
