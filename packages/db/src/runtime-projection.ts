import { createHash } from "node:crypto";
import type {
    EvidenceOrigin as EvidenceOriginValue,
    SchedulerLane as SchedulerLaneValue
} from "@lab/core/constants";
import { EvidenceOrigin, SchedulerLane } from "@lab/core/constants";
import {
    AgentRole,
    type AgentRole as AgentRoleValue,
    EvidenceKind,
    ExperimentStatus,
    type ExperimentStatus as ExperimentStatusValue,
    SourceRetrievalMethod
} from "@lab/protocol/constants";
import type { Evidence } from "@lab/protocol/schemas";
import type { StatusSnapshot } from "@lab/protocol/status";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import type { Database } from "#src/client";
import { AttemptStatus, EvidenceRelationship, ExternalEffect } from "#src/constants";
import {
    attempts,
    branches,
    capabilityRequests,
    claimDependencies,
    claimEvidence,
    claims,
    evidence,
    tasks
} from "#src/schema";

const RuntimeProjectionDefaults = {
    EMPTY_BRANCH_LANE: SchedulerLane.EXPLORATION,
    TASK_PRIORITY: 0,
    FIRST_ATTEMPT_NUMBER: 1
} as const;

const AgentRoleSchedulerLane = {
    [AgentRole.DIRECTOR]: SchedulerLane.EXPLORATION,
    [AgentRole.RESEARCHER]: SchedulerLane.EXPLORATION,
    [AgentRole.CRITIC]: SchedulerLane.ADVERSARIAL,
    [AgentRole.VERIFIER]: SchedulerLane.REPRODUCTION
} as const satisfies Record<AgentRoleValue, SchedulerLaneValue>;

const ExperimentAttemptStatus = {
    [ExperimentStatus.PLANNED]: AttemptStatus.PLANNED,
    [ExperimentStatus.RUNNING]: AttemptStatus.RUNNING,
    [ExperimentStatus.SUCCEEDED]: AttemptStatus.SUCCEEDED,
    [ExperimentStatus.FAILED]: AttemptStatus.FAILED,
    [ExperimentStatus.TIMED_OUT]: AttemptStatus.TIMED_OUT,
    [ExperimentStatus.CANCELLED]: AttemptStatus.CANCELLED
} as const satisfies Record<
    ExperimentStatusValue,
    (typeof AttemptStatus)[keyof typeof AttemptStatus]
>;

const UnboundEvidenceOrigin = {
    [EvidenceKind.EXPERIMENT]: EvidenceOrigin.MODEL_JUDGEMENT,
    [EvidenceKind.SOURCE]: EvidenceOrigin.MODEL_JUDGEMENT,
    [EvidenceKind.ARTIFACT]: EvidenceOrigin.MODEL_JUDGEMENT,
    [EvidenceKind.COUNTEREXAMPLE]: EvidenceOrigin.MODEL_JUDGEMENT,
    [EvidenceKind.VERIFIER_RESULT]: EvidenceOrigin.MODEL_JUDGEMENT
} as const satisfies Record<Evidence["kind"], EvidenceOriginValue>;

const EvidenceIntegrity = {
    SHA256_PATTERN: /^[a-f0-9]{64}$/u
} as const;

type RuntimeProjectionDatabase = Pick<Database, "delete" | "insert" | "select">;

export async function projectRuntimeSnapshot(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    evidenceRecords: readonly Evidence[] = []
): Promise<void> {
    assertProjectionRelationships(snapshot, evidenceRecords);
    const labId = snapshot.lab.id;
    const projectionAt = new Date(snapshot.lab.updated_at);

    await assertEntityOwnership(database, snapshot, evidenceRecords);
    await upsertBranches(database, snapshot, projectionAt);
    await upsertTasks(database, snapshot, projectionAt);
    await upsertClaims(database, snapshot);
    await replaceClaimDependencies(database, snapshot);
    await upsertAttempts(database, snapshot, projectionAt);
    await upsertEvidence(database, snapshot, evidenceRecords);
    await replaceClaimEvidence(database, snapshot, evidenceRecords);
    await upsertCapabilities(database, snapshot, projectionAt);

    await deleteMissingCapabilities(database, labId, idsOf(snapshot.capability_requests));
    await deleteMissingEvidence(database, labId, idsOf(evidenceRecords));
    await deleteMissingTasks(database, labId, idsOf(snapshot.tasks));
    await deleteMissingClaims(database, labId, idsOf(snapshot.claims));
    await deleteMissingBranches(database, labId, idsOf(snapshot.branches));
}

async function upsertBranches(
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

async function upsertTasks(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    projectionAt: Date
): Promise<void> {
    for (const task of snapshot.tasks) {
        const records = await database
            .insert(tasks)
            .values({
                id: task.id,
                labId: snapshot.lab.id,
                branchId: task.branch_id,
                objective: task.objective,
                contextRefs: task.context_refs,
                status: task.status,
                role: task.role,
                lane: AgentRoleSchedulerLane[task.role],
                priority: RuntimeProjectionDefaults.TASK_PRIORITY,
                attempt: task.attempt,
                availableAt: projectionAt,
                createdAt: projectionAt,
                updatedAt: projectionAt
            })
            .onConflictDoUpdate({
                target: tasks.id,
                set: {
                    branchId: task.branch_id,
                    objective: task.objective,
                    contextRefs: task.context_refs,
                    status: task.status,
                    role: task.role,
                    lane: AgentRoleSchedulerLane[task.role],
                    attempt: task.attempt,
                    updatedAt: projectionAt
                },
                setWhere: eq(tasks.labId, snapshot.lab.id)
            })
            .returning({ id: tasks.id });
        assertUpserted(records, "task", task.id);
    }
}

function branchSchedulerLane(snapshot: StatusSnapshot, branchId: string): SchedulerLaneValue {
    const taskLanes = new Set(
        snapshot.tasks
            .filter((task) => task.branch_id === branchId)
            .map((task) => AgentRoleSchedulerLane[task.role])
    );
    const [lane, conflictingLane] = taskLanes;
    if (lane === undefined) {
        return RuntimeProjectionDefaults.EMPTY_BRANCH_LANE;
    }
    if (conflictingLane !== undefined) {
        throw new Error(`Branch ${branchId} contains tasks from multiple scheduler lanes`);
    }
    return lane;
}

async function upsertAttempts(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    projectionAt: Date
): Promise<void> {
    const taskIds = idsOf(snapshot.tasks);
    const existingAttempts =
        taskIds.length === 0
            ? []
            : await database
                  .select({
                      id: attempts.id,
                      taskId: attempts.taskId,
                      attemptNumber: attempts.attemptNumber
                  })
                  .from(attempts)
                  .where(inArray(attempts.taskId, taskIds));
    const existingById = new Map(existingAttempts.map((attempt) => [attempt.id, attempt]));
    const occupiedNumbers = new Map<string, Set<number>>();
    for (const attempt of existingAttempts) {
        const occupied = occupiedNumbers.get(attempt.taskId) ?? new Set<number>();
        occupied.add(attempt.attemptNumber);
        occupiedNumbers.set(attempt.taskId, occupied);
    }

    for (const experiment of snapshot.experiments) {
        const task = snapshot.tasks.find(({ id }) => id === experiment.task_id);
        if (task === undefined) {
            throw new Error(
                `Experiment ${experiment.id} references missing task ${experiment.task_id}`
            );
        }
        const existing = existingById.get(experiment.id);
        const attemptNumber =
            existing?.attemptNumber ??
            allocateAttemptNumber(occupiedNumbers, task.id, task.attempt);
        const startedAt = parseOptionalTimestamp(experiment.started_at);
        const finishedAt = parseOptionalTimestamp(experiment.finished_at);
        const records = await database
            .insert(attempts)
            .values({
                id: experiment.id,
                taskId: experiment.task_id,
                attemptNumber,
                workerId: experiment.evaluator,
                status: ExperimentAttemptStatus[experiment.status],
                command: experiment.command,
                cwd: experiment.cwd,
                inputs: {
                    hypothesis: experiment.hypothesis,
                    ...(experiment.execution_fingerprint === undefined
                        ? {}
                        : { execution_fingerprint: experiment.execution_fingerprint })
                },
                environment: {},
                stdoutPath: experiment.output_path,
                outputHash: experiment.output_hash,
                exitCode: experiment.exit_code,
                externalEffect: experiment.external_effect ?? ExternalEffect.NONE,
                reconciliationKey: experiment.reconciliation_key,
                startedAt,
                finishedAt,
                createdAt: startedAt ?? projectionAt,
                updatedAt: projectionAt
            })
            .onConflictDoUpdate({
                target: attempts.id,
                set: {
                    workerId: experiment.evaluator,
                    status: ExperimentAttemptStatus[experiment.status],
                    command: experiment.command,
                    cwd: experiment.cwd,
                    stdoutPath: experiment.output_path ?? null,
                    outputHash: experiment.output_hash ?? null,
                    exitCode: experiment.exit_code ?? null,
                    inputs: {
                        hypothesis: experiment.hypothesis,
                        ...(experiment.execution_fingerprint === undefined
                            ? {}
                            : { execution_fingerprint: experiment.execution_fingerprint })
                    },
                    externalEffect: experiment.external_effect ?? ExternalEffect.NONE,
                    reconciliationKey: experiment.reconciliation_key ?? null,
                    startedAt: startedAt ?? null,
                    finishedAt: finishedAt ?? null,
                    updatedAt: projectionAt
                },
                setWhere: eq(attempts.taskId, experiment.task_id)
            })
            .returning({ id: attempts.id });
        assertUpserted(records, "attempt", experiment.id);
        existingById.set(experiment.id, {
            id: experiment.id,
            taskId: experiment.task_id,
            attemptNumber
        });
    }
}

async function upsertClaims(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    for (const claim of snapshot.claims) {
        const records = await database
            .insert(claims)
            .values({
                id: claim.id,
                labId: snapshot.lab.id,
                branchId: claim.branch_id,
                statement: claim.statement,
                status: claim.status,
                stale: claim.stale,
                createdAt: new Date(claim.created_at),
                updatedAt: new Date(claim.updated_at)
            })
            .onConflictDoUpdate({
                target: claims.id,
                set: {
                    branchId: claim.branch_id,
                    statement: claim.statement,
                    status: claim.status,
                    stale: claim.stale,
                    updatedAt: new Date(claim.updated_at)
                },
                setWhere: eq(claims.labId, snapshot.lab.id)
            })
            .returning({ id: claims.id });
        assertUpserted(records, "claim", claim.id);
    }
}

async function upsertEvidence(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    evidenceRecords: readonly Evidence[]
): Promise<void> {
    for (const candidate of evidenceRecords) {
        const projection = projectEvidence(snapshot, candidate);
        const records = await database
            .insert(evidence)
            .values(projection)
            .onConflictDoUpdate({
                target: evidence.id,
                set: {
                    sourceBranchId: projection.sourceBranchId,
                    attemptId: projection.attemptId ?? null,
                    kind: projection.kind,
                    origin: projection.origin,
                    fingerprint: projection.fingerprint,
                    runId: projection.runId ?? null,
                    artifactPath: projection.artifactPath ?? null,
                    artifactHash: projection.artifactHash ?? null,
                    summary: projection.summary,
                    independent: projection.independent,
                    valid: projection.valid,
                    complete: projection.complete,
                    reproducible: projection.reproducible,
                    createdAt: projection.createdAt
                },
                setWhere: eq(evidence.labId, snapshot.lab.id)
            })
            .returning({ id: evidence.id });
        assertUpserted(records, "evidence", candidate.id);
    }
}

async function replaceClaimEvidence(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    evidenceRecords: readonly Evidence[]
): Promise<void> {
    const claimIds = idsOf(snapshot.claims);
    if (claimIds.length === 0) {
        return;
    }
    await database.delete(claimEvidence).where(inArray(claimEvidence.claimId, claimIds));
    if (evidenceRecords.length === 0) {
        return;
    }
    await database.insert(claimEvidence).values(
        evidenceRecords.map((candidate) => ({
            claimId: candidate.claim_id,
            evidenceId: candidate.id,
            relationship:
                candidate.kind === EvidenceKind.SOURCE
                    ? EvidenceRelationship.CITES
                    : candidate.supports
                      ? EvidenceRelationship.SUPPORTS
                      : EvidenceRelationship.CONTRADICTS
        }))
    );
}

async function replaceClaimDependencies(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    const claimIds = idsOf(snapshot.claims);
    if (claimIds.length === 0) {
        return;
    }
    await database.delete(claimDependencies).where(inArray(claimDependencies.claimId, claimIds));
    const dependencies = snapshot.claims.flatMap((claim) =>
        claim.assumption_ids.map((dependencyId) => ({
            claimId: claim.id,
            dependencyId
        }))
    );
    if (dependencies.length > 0) {
        await database.insert(claimDependencies).values(dependencies);
    }
}

async function upsertCapabilities(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    projectionAt: Date
): Promise<void> {
    for (const capability of snapshot.capability_requests) {
        const providedAt =
            capability.provided_at === undefined ? null : new Date(capability.provided_at);
        const resourceReference = capability.resource_reference ?? null;
        const records = await database
            .insert(capabilityRequests)
            .values({
                id: capability.id,
                labId: snapshot.lab.id,
                need: capability.need,
                reason: capability.reason,
                provisioningHint: capability.provisioning_hint,
                status: capability.status,
                resourceReference,
                providedAt,
                createdAt: new Date(capability.created_at),
                updatedAt: projectionAt
            })
            .onConflictDoUpdate({
                target: capabilityRequests.id,
                set: {
                    need: capability.need,
                    reason: capability.reason,
                    provisioningHint: capability.provisioning_hint,
                    status: capability.status,
                    resourceReference,
                    providedAt,
                    updatedAt: projectionAt
                },
                setWhere: eq(capabilityRequests.labId, snapshot.lab.id)
            })
            .returning({ id: capabilityRequests.id });
        assertUpserted(records, "capability request", capability.id);
    }
}

async function deleteMissingCapabilities(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(capabilityRequests)
        .where(
            ids.length === 0
                ? eq(capabilityRequests.labId, labId)
                : and(eq(capabilityRequests.labId, labId), notInArray(capabilityRequests.id, ids))
        );
}

async function deleteMissingEvidence(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(evidence)
        .where(
            ids.length === 0
                ? eq(evidence.labId, labId)
                : and(eq(evidence.labId, labId), notInArray(evidence.id, ids))
        );
}

async function deleteMissingTasks(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(tasks)
        .where(
            ids.length === 0
                ? eq(tasks.labId, labId)
                : and(eq(tasks.labId, labId), notInArray(tasks.id, ids))
        );
}

async function deleteMissingClaims(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(claims)
        .where(
            ids.length === 0
                ? eq(claims.labId, labId)
                : and(eq(claims.labId, labId), notInArray(claims.id, ids))
        );
}

async function deleteMissingBranches(
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

async function assertEntityOwnership(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    evidenceRecords: readonly Evidence[]
): Promise<void> {
    const branchIds = idsOf(snapshot.branches);
    const taskIds = idsOf(snapshot.tasks);
    const claimIds = idsOf(snapshot.claims);
    const capabilityIds = idsOf(snapshot.capability_requests);
    const attemptIds = idsOf(snapshot.experiments);
    const evidenceIds = idsOf(evidenceRecords);
    const [
        ownedBranches,
        ownedTasks,
        ownedClaims,
        ownedCapabilities,
        ownedAttempts,
        ownedEvidence
    ] = await Promise.all([
        branchIds.length === 0
            ? []
            : database
                  .select({ id: branches.id, labId: branches.labId })
                  .from(branches)
                  .where(inArray(branches.id, branchIds)),
        taskIds.length === 0
            ? []
            : database
                  .select({ id: tasks.id, labId: tasks.labId })
                  .from(tasks)
                  .where(inArray(tasks.id, taskIds)),
        claimIds.length === 0
            ? []
            : database
                  .select({ id: claims.id, labId: claims.labId })
                  .from(claims)
                  .where(inArray(claims.id, claimIds)),
        capabilityIds.length === 0
            ? []
            : database
                  .select({ id: capabilityRequests.id, labId: capabilityRequests.labId })
                  .from(capabilityRequests)
                  .where(inArray(capabilityRequests.id, capabilityIds)),
        attemptIds.length === 0
            ? []
            : database
                  .select({ id: attempts.id, taskId: attempts.taskId })
                  .from(attempts)
                  .where(inArray(attempts.id, attemptIds)),
        evidenceIds.length === 0
            ? []
            : database
                  .select({ id: evidence.id, labId: evidence.labId })
                  .from(evidence)
                  .where(inArray(evidence.id, evidenceIds))
    ]);
    const foreign = [
        ...ownedBranches,
        ...ownedTasks,
        ...ownedClaims,
        ...ownedCapabilities,
        ...ownedEvidence
    ].find((record) => record.labId !== snapshot.lab.id);
    if (foreign !== undefined) {
        throw new Error(`Entity ${foreign.id} belongs to another lab`);
    }
    const snapshotTaskIds = new Set(taskIds);
    const foreignAttempt = ownedAttempts.find((record) => !snapshotTaskIds.has(record.taskId));
    if (foreignAttempt !== undefined) {
        throw new Error(`Attempt ${foreignAttempt.id} belongs to another lab`);
    }
}

function assertProjectionRelationships(
    snapshot: StatusSnapshot,
    evidenceRecords: readonly Evidence[]
): void {
    assertUniqueIds("branch", idsOf(snapshot.branches));
    assertUniqueIds("task", idsOf(snapshot.tasks));
    assertUniqueIds("claim", idsOf(snapshot.claims));
    assertUniqueIds("experiment", idsOf(snapshot.experiments));
    assertUniqueIds("evidence", idsOf(evidenceRecords));
    assertUniqueEvidenceFingerprints(evidenceRecords);
    assertUniqueIds("capability request", idsOf(snapshot.capability_requests));

    const branchIds = new Set(idsOf(snapshot.branches));
    const tasksById = new Map(snapshot.tasks.map((task) => [task.id, task]));
    for (const task of snapshot.tasks) {
        assertRelatedEntity("task", task.id, "branch", task.branch_id, branchIds);
    }
    for (const experiment of snapshot.experiments) {
        assertRelatedEntity(
            "experiment",
            experiment.id,
            "task",
            experiment.task_id,
            new Set(tasksById.keys())
        );
        const task = tasksById.get(experiment.task_id);
        if (task !== undefined && experiment.branch_id !== task.branch_id) {
            throw new Error(
                `Experiment ${experiment.id} belongs to branch ${experiment.branch_id}, but its task belongs to ${task.branch_id}`
            );
        }
    }
    const claimIds = new Set(idsOf(snapshot.claims));
    for (const claim of snapshot.claims) {
        assertRelatedEntity("claim", claim.id, "branch", claim.branch_id, branchIds);
        assertUniqueIds(`dependency of claim ${claim.id}`, claim.assumption_ids);
        for (const dependencyId of claim.assumption_ids) {
            if (dependencyId === claim.id) {
                throw new Error(`Claim ${claim.id} cannot depend on itself`);
            }
            assertRelatedEntity("claim", claim.id, "claim", dependencyId, claimIds);
        }
    }
    for (const candidate of evidenceRecords) {
        assertRelatedEntity("evidence", candidate.id, "claim", candidate.claim_id, claimIds);
    }
}

function allocateAttemptNumber(
    occupiedNumbers: Map<string, Set<number>>,
    taskId: string,
    requestedNumber: number
): number {
    const occupied = occupiedNumbers.get(taskId) ?? new Set<number>();
    let candidate = Math.max(RuntimeProjectionDefaults.FIRST_ATTEMPT_NUMBER, requestedNumber);
    while (occupied.has(candidate)) {
        candidate += 1;
    }
    occupied.add(candidate);
    occupiedNumbers.set(taskId, occupied);
    return candidate;
}

function projectEvidence(snapshot: StatusSnapshot, candidate: Evidence) {
    const claim = snapshot.claims.find(({ id }) => id === candidate.claim_id);
    if (claim === undefined) {
        throw new Error(`Evidence ${candidate.id} references missing claim ${candidate.claim_id}`);
    }
    const experiment = snapshot.experiments.find(({ id }) => id === candidate.run_id);
    const experimentTask = snapshot.tasks.find(({ id }) => id === experiment?.task_id);
    const runTask = snapshot.tasks.find(({ id }) => id === candidate.run_id);
    const sourceTask = experimentTask ?? runTask;
    const sourceBranchId = sourceTask?.branch_id ?? claim.branch_id;
    const hasArtifactPair =
        candidate.artifact_path !== undefined && candidate.artifact_hash !== undefined;
    const valid =
        hasArtifactPair && EvidenceIntegrity.SHA256_PATTERN.test(candidate.artifact_hash ?? "");
    const verifierOriginEstablished =
        candidate.kind === EvidenceKind.VERIFIER_RESULT &&
        candidate.independent &&
        sourceTask?.role === AgentRole.VERIFIER &&
        sourceBranchId !== claim.branch_id;
    const empiricalOriginEstablished =
        experiment !== undefined &&
        valid &&
        candidate.kind !== EvidenceKind.SOURCE &&
        candidate.kind !== EvidenceKind.VERIFIER_RESULT;
    const daemonFetchedSourceEstablished =
        candidate.kind === EvidenceKind.SOURCE &&
        candidate.source?.retrieval_method === SourceRetrievalMethod.DAEMON_HTTP &&
        valid;
    const origin = daemonFetchedSourceEstablished
        ? EvidenceOrigin.DAEMON_FETCHED_SOURCE
        : verifierOriginEstablished
          ? EvidenceOrigin.VERIFIER
          : empiricalOriginEstablished
            ? EvidenceOrigin.EMPIRICAL
            : UnboundEvidenceOrigin[candidate.kind];

    return {
        id: candidate.id,
        labId: snapshot.lab.id,
        sourceBranchId,
        attemptId: experiment?.id,
        kind: candidate.kind,
        origin,
        fingerprint: evidenceFingerprint(candidate),
        runId: candidate.run_id,
        artifactPath: candidate.artifact_path,
        artifactHash: candidate.artifact_hash,
        summary: candidate.summary,
        independent: candidate.independent,
        valid,
        complete: hasArtifactPair,
        reproducible:
            candidate.kind === EvidenceKind.VERIFIER_RESULT &&
            candidate.supports &&
            candidate.independent &&
            sourceTask?.role === AgentRole.VERIFIER &&
            origin === EvidenceOrigin.VERIFIER &&
            valid,
        createdAt: new Date(candidate.created_at)
    };
}

export function evidenceFingerprint(candidate: Evidence): string {
    const serialized = JSON.stringify([
        candidate.claim_id,
        candidate.kind,
        candidate.run_id ?? null,
        candidate.artifact_hash ?? null,
        candidate.supports,
        candidate.independent
    ]);
    return createHash("sha256").update(serialized).digest("hex");
}

function assertUniqueEvidenceFingerprints(evidenceRecords: readonly Evidence[]): void {
    const evidenceByFingerprint = new Map<string, string>();
    for (const candidate of evidenceRecords) {
        const fingerprint = evidenceFingerprint(candidate);
        const existingId = evidenceByFingerprint.get(fingerprint);
        if (existingId !== undefined) {
            throw new Error(`Evidence ${candidate.id} duplicates semantic evidence ${existingId}`);
        }
        evidenceByFingerprint.set(fingerprint, candidate.id);
    }
}

function parseOptionalTimestamp(value: string | undefined): Date | null {
    return value === undefined ? null : new Date(value);
}

function assertRelatedEntity(
    entityKind: string,
    entityId: string,
    relationKind: string,
    relationId: string,
    availableIds: ReadonlySet<string>
): void {
    if (!availableIds.has(relationId)) {
        throw new Error(
            `${entityKind} ${entityId} references missing ${relationKind} ${relationId}`
        );
    }
}

function assertUniqueIds(entityKind: string, ids: readonly string[]): void {
    if (new Set(ids).size !== ids.length) {
        throw new Error(`Runtime snapshot contains duplicate ${entityKind} identifiers`);
    }
}

function assertUpserted(
    records: readonly { readonly id: string }[],
    kind: string,
    id: string
): void {
    if (records.length !== 1) {
        throw new Error(`Failed to project ${kind} ${id}`);
    }
}

function idsOf(records: readonly { readonly id: string }[]): string[] {
    return records.map(({ id }) => id);
}
