import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import { AssumptionStatus } from "@openlab/protocol/assumptions/assumption-status.const";
import { CapabilityStatus } from "@openlab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@openlab/protocol/findings/finding-status.const";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    agentRuns,
    assumptions,
    capabilityRequests,
    findings,
    verdicts
} from "#src/lab-database/lab-schema";
import { openTestDatabase, type TestDatabase } from "#src/lab-database/test-database";
import { RuntimePersistence } from "#src/runtime/runtime-persistence";
import {
    makeEvent,
    makeInput,
    makeSnapshot,
    testEventId,
    testInvestigationId
} from "#src/runtime/runtime-snapshot.fixture";

describe("Runtime snapshot normalized table projection", () => {
    let database: TestDatabase;
    let persistence: RuntimePersistence;

    beforeEach(async () => {
        database = await openTestDatabase();
        persistence = new RuntimePersistence(database);
    });

    afterEach(async () => {
        await database.close();
    });

    it("projects checkpoint state into normalized tables and removes stale rows", async () => {
        const input = makeInput();
        const snapshot = makeSnapshot(testInvestigationId("projection"), input);
        const abandonedAssumptionId = `${snapshot.investigation.id}-assumption-abandoned`;
        snapshot.assumptions.push({
            id: abandonedAssumptionId,
            cycle: 0,
            statement: "The bottleneck is lock contention",
            rationale: "The profile shows time in the scheduler",
            status: AssumptionStatus.OPEN,
            created_at: snapshot.investigation.started_at,
            updated_at: snapshot.investigation.updated_at
        });

        await persistence.initialize({
            task: input,
            workspacePath: "/tmp/lab-runtime-projection",
            snapshot
        });

        expect(
            await database.db.query.assumptions.findMany({
                where: eq(assumptions.investigationId, snapshot.investigation.id)
            })
        ).toHaveLength(2);
        expect(
            await database.db.query.agentRuns.findMany({
                where: eq(agentRuns.investigationId, snapshot.investigation.id)
            })
        ).toHaveLength(3);
        expect(
            await database.db.query.findings.findFirst({
                where: eq(findings.investigationId, snapshot.investigation.id)
            })
        ).toEqual(
            expect.objectContaining({
                id: snapshot.findings[0]?.id,
                status: FindingStatus.UNVERIFIED,
                artifactPaths: ["artifacts/bench.json"]
            })
        );

        const updated = structuredClone(snapshot);
        updated.investigation.updated_at = "2026-08-02T00:10:00.000Z";
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
        researchedAssumption.updated_at = updated.investigation.updated_at;
        verifierRun.status = AgentRunStatus.SUCCEEDED;
        verifierRun.finished_at = updated.investigation.updated_at;
        updated.verdicts = [
            {
                id: `${updated.investigation.id}-verdict-primary`,
                finding_id: finding.id,
                run_id: verifierRun.id,
                confirmed: true,
                reasoning: "Rebuilt the workload from scratch and the stall disappeared as claimed",
                created_at: updated.investigation.updated_at
            }
        ];
        updated.breakthrough_finding_id = finding.id;
        capability.status = CapabilityStatus.ANSWERED;
        capability.answer = "Not reserving a host for this; pin the cores and report the variance";
        capability.answered_at = updated.investigation.updated_at;

        const committed = await persistence.commit({ snapshot: updated, expectedRevision: 1 });
        expect(committed.revision).toBe(2);
        expect(
            await database.db.query.assumptions.findMany({
                where: eq(assumptions.investigationId, snapshot.investigation.id)
            })
        ).toHaveLength(1);
        expect(
            await database.db.query.findings.findFirst({ where: eq(findings.id, finding.id) })
        ).toEqual(expect.objectContaining({ status: FindingStatus.CONFIRMED }));
        expect(
            await database.db.query.verdicts.findFirst({
                where: eq(verdicts.findingId, finding.id)
            })
        ).toEqual(expect.objectContaining({ confirmed: true }));
        expect(
            await database.db.query.agentRuns.findFirst({ where: eq(agentRuns.id, verifierRun.id) })
        ).toEqual(
            expect.objectContaining({
                status: AgentRunStatus.SUCCEEDED,
                finishedAt: new Date(updated.investigation.updated_at)
            })
        );
        expect(
            await database.db.query.capabilityRequests.findFirst({
                where: eq(capabilityRequests.id, capability.id)
            })
        ).toEqual(
            expect.objectContaining({
                status: CapabilityStatus.ANSWERED,
                answer: capability.answer,
                answeredAt: new Date(updated.investigation.updated_at)
            })
        );

        const invalid = structuredClone(updated);
        const orphanedFinding = invalid.findings[0];
        if (orphanedFinding === undefined) {
            throw new Error("Projection fixture must carry a finding");
        }
        orphanedFinding.assumption_id = `${snapshot.investigation.id}-missing-assumption`;
        orphanedFinding.status = FindingStatus.REFUTED;
        invalid.investigation.updated_at = "2026-08-02T00:11:00.000Z";
        await expect(
            persistence.commit({
                snapshot: invalid,
                expectedRevision: 2,
                event: makeEvent(
                    EventType.FINDING_REFUTED,
                    snapshot.investigation.id,
                    "event-invalid-projection",
                    invalid.investigation.updated_at
                )
            })
        ).rejects.toThrow(`references missing assumption ${orphanedFinding.assumption_id}`);

        expect((await persistence.load(snapshot.investigation.id))?.checkpoint.revision).toBe(2);
        expect(
            await database.db.query.findings.findFirst({ where: eq(findings.id, finding.id) })
        ).toEqual(expect.objectContaining({ status: FindingStatus.CONFIRMED }));
        expect(
            (await persistence.eventsAfter(snapshot.investigation.id)).map(({ id }) => id)
        ).not.toContain(testEventId(snapshot.investigation.id, "event-invalid-projection"));
    });
});
