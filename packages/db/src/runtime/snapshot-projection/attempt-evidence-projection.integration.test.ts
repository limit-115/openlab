import { EvidenceOrigin } from "@lab/core/claims/evidence-origin.const";
import {
    AgentRole,
    BranchStatus,
    ExperimentStatus,
    InternalTaskStatus
} from "@lab/protocol/constants";
import type { Evidence } from "@lab/protocol/schemas";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EvidenceRelationship } from "#src/claims/evidence-relationship.const";
import { createDatabase, type DatabaseClient } from "#src/lab-database/lab-database-client";
import { attempts, claimEvidence, evidence } from "#src/lab-database/lab-schema";
import { migrateDatabase } from "#src/lab-database/lab-schema-migration";
import { RuntimePersistence } from "#src/runtime/runtime-persistence";
import {
    makeEvidence,
    makeSnapshot,
    makeTask,
    testLabId
} from "#src/runtime/runtime-snapshot.fixture";
import { AttemptStatus, ExternalEffect } from "#src/tasks/attempt-execution.const";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

describeDatabase("Runtime snapshot attempt and evidence projection", () => {
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

    it("atomically projects stable attempts and material evidence", async () => {
        const task = makeTask(testLabId("operational-projection"));
        const snapshot = makeSnapshot(task);
        const branchId = snapshot.branches[0]?.id;
        const taskId = snapshot.tasks[0]?.id;
        const claimId = snapshot.claims[1]?.id;
        if (branchId === undefined || taskId === undefined || claimId === undefined) {
            throw new Error("Operational projection fixture is incomplete");
        }
        const verifierBranchId = `${snapshot.lab.id}-branch-verifier`;
        const verifierTaskId = `${snapshot.lab.id}-task-verifier`;
        const experimentId = `${snapshot.lab.id}-experiment-primary`;
        snapshot.branches.push({
            id: verifierBranchId,
            title: "Independent verification",
            approach: "Reproduce the result independently",
            status: BranchStatus.ACTIVE,
            progress: "Running"
        });
        snapshot.tasks.push({
            id: verifierTaskId,
            branch_id: verifierBranchId,
            objective: "Reproduce the primary claim",
            context_refs: [],
            status: InternalTaskStatus.RUNNING,
            attempt: 1,
            role: AgentRole.VERIFIER
        });
        snapshot.experiments.push({
            id: experimentId,
            task_id: taskId,
            branch_id: branchId,
            hypothesis: "The measured result is stable",
            evaluator: "local-evaluator",
            command: "node evaluator.ts",
            cwd: "/tmp/research-branch",
            status: ExperimentStatus.RUNNING,
            started_at: "2026-08-02T00:01:00.000Z",
            external_effect: ExternalEffect.IRREVERSIBLE,
            reconciliation_key: "external-operation-primary",
            execution_fingerprint: "c".repeat(64)
        });
        const evidenceRecords = makeEvidence(
            snapshot.lab.id,
            claimId,
            experimentId,
            verifierTaskId
        );

        const initialized = await persistence.initialize({
            task,
            workspacePath: "/tmp/lab-operational-projection",
            snapshot,
            evidence: evidenceRecords
        });

        expect(initialized.evidence).toEqual(evidenceRecords);
        expect(
            await client.db.query.attempts.findFirst({
                where: eq(attempts.id, experimentId)
            })
        ).toMatchObject({
            taskId,
            attemptNumber: 1,
            workerId: "local-evaluator",
            status: AttemptStatus.RUNNING,
            command: "node evaluator.ts",
            cwd: "/tmp/research-branch",
            inputs: {
                hypothesis: "The measured result is stable",
                execution_fingerprint: "c".repeat(64)
            },
            environment: {},
            externalEffect: ExternalEffect.IRREVERSIBLE,
            reconciliationKey: "external-operation-primary"
        });
        expect(
            await client.db.query.evidence.findMany({
                where: eq(evidence.labId, snapshot.lab.id)
            })
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: evidenceRecords[0]?.id,
                    sourceBranchId: branchId,
                    attemptId: experimentId,
                    origin: EvidenceOrigin.EMPIRICAL,
                    fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/u),
                    valid: true,
                    complete: true,
                    reproducible: false
                }),
                expect.objectContaining({
                    id: evidenceRecords[1]?.id,
                    sourceBranchId: verifierBranchId,
                    attemptId: null,
                    origin: EvidenceOrigin.VERIFIER,
                    valid: true,
                    complete: true,
                    reproducible: true
                }),
                expect.objectContaining({
                    id: evidenceRecords[3]?.id,
                    sourceBranchId: branchId,
                    attemptId: experimentId,
                    origin: EvidenceOrigin.DAEMON_FETCHED_SOURCE,
                    valid: true,
                    complete: true,
                    reproducible: false
                })
            ])
        );
        expect(
            await client.db.query.claimEvidence.findMany({
                where: eq(claimEvidence.claimId, claimId)
            })
        ).toEqual(
            expect.arrayContaining([
                {
                    claimId,
                    evidenceId: evidenceRecords[0]?.id,
                    relationship: EvidenceRelationship.SUPPORTS
                },
                {
                    claimId,
                    evidenceId: evidenceRecords[2]?.id,
                    relationship: EvidenceRelationship.CONTRADICTS
                },
                {
                    claimId,
                    evidenceId: evidenceRecords[3]?.id,
                    relationship: EvidenceRelationship.CITES
                }
            ])
        );

        const updated = structuredClone(snapshot);
        const projectedExperiment = updated.experiments[0];
        const projectedTask = updated.tasks.find(({ id }) => id === taskId);
        if (projectedExperiment === undefined || projectedTask === undefined) {
            throw new Error("Operational update fixture is incomplete");
        }
        projectedExperiment.status = ExperimentStatus.SUCCEEDED;
        projectedExperiment.exit_code = 0;
        projectedExperiment.finished_at = "2026-08-02T00:02:00.000Z";
        projectedExperiment.output_path = "artifacts/evaluator.stdout";
        projectedExperiment.output_hash = "b".repeat(64);
        projectedTask.attempt = 2;
        updated.experiments.push({
            id: `${snapshot.lab.id}-experiment-follow-up`,
            task_id: taskId,
            branch_id: branchId,
            hypothesis: "The follow-up remains stable",
            evaluator: "local-evaluator",
            command: "node evaluator.ts",
            cwd: "/tmp/research-branch",
            status: ExperimentStatus.PLANNED
        });
        updated.lab.updated_at = "2026-08-02T00:03:00.000Z";
        updated.frontier.updated_at = updated.lab.updated_at;

        const committed = await persistence.commit({
            snapshot: updated,
            evidence: evidenceRecords,
            expectedRevision: initialized.revision
        });

        expect(committed.evidence).toEqual(evidenceRecords);
        expect(
            await client.db.query.attempts.findMany({
                where: eq(attempts.taskId, taskId),
                orderBy: (attempt, { asc }) => [asc(attempt.attemptNumber)]
            })
        ).toEqual([
            expect.objectContaining({
                id: experimentId,
                attemptNumber: 1,
                status: AttemptStatus.SUCCEEDED,
                stdoutPath: "artifacts/evaluator.stdout",
                outputHash: "b".repeat(64),
                exitCode: 0,
                externalEffect: ExternalEffect.IRREVERSIBLE,
                reconciliationKey: "external-operation-primary"
            }),
            expect.objectContaining({
                id: `${snapshot.lab.id}-experiment-follow-up`,
                attemptNumber: 2,
                status: AttemptStatus.PLANNED
            })
        ]);
        expect((await persistence.load(snapshot.lab.id))?.checkpoint.evidence).toEqual(
            evidenceRecords
        );

        const primaryEvidence = evidenceRecords[0];
        if (primaryEvidence === undefined) {
            throw new Error("Operational evidence fixture is incomplete");
        }
        const duplicateEvidence: Evidence = {
            ...primaryEvidence,
            id: `${snapshot.lab.id}-evidence-semantic-duplicate`,
            artifact_path: "artifacts/copied-experiment.json",
            summary: "A relabeled copy of the same result",
            created_at: "2026-08-02T00:04:00.000Z"
        };
        await expect(
            persistence.commit({
                snapshot: updated,
                evidence: [...evidenceRecords, duplicateEvidence],
                expectedRevision: committed.revision
            })
        ).rejects.toThrow(`duplicates semantic evidence ${primaryEvidence.id}`);
        expect((await persistence.load(snapshot.lab.id))?.checkpoint.revision).toBe(
            committed.revision
        );
        expect(
            await client.db.query.evidence.findMany({
                where: eq(evidence.labId, snapshot.lab.id)
            })
        ).toHaveLength(evidenceRecords.length);
    });
});
