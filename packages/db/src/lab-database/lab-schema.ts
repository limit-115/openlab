import { EvidenceOrigin } from "@lab/core/claims/evidence-origin.const";
import { SchedulerLane } from "@lab/core/scheduling/scheduler-lane.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import {
    CapabilityResourceClass,
    CapabilityStatus
} from "@lab/protocol/capabilities/capability-request.const";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import { domainValues } from "@lab/protocol/finite-domain/finite-domain-values";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import {
    bigint,
    boolean,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uniqueIndex
} from "drizzle-orm/pg-core";
import { EvidenceRelationship } from "#src/claims/evidence-relationship.const";
import { AttemptStatus, ExternalEffect } from "#src/tasks/attempt-execution.const";

export const labStateEnum = pgEnum("lab_state", domainValues(LabState));
export const branchStatusEnum = pgEnum("branch_status", domainValues(BranchStatus));
export const agentRoleEnum = pgEnum("agent_role", domainValues(AgentRole));
export const schedulerLaneEnum = pgEnum("scheduler_lane", domainValues(SchedulerLane));
export const taskStatusEnum = pgEnum("task_status", domainValues(InternalTaskStatus));
export const attemptStatusEnum = pgEnum("attempt_status", domainValues(AttemptStatus));
export const externalEffectEnum = pgEnum("external_effect", domainValues(ExternalEffect));
export const claimStatusEnum = pgEnum("claim_status", domainValues(ClaimStatus));
export const evidenceKindEnum = pgEnum("evidence_kind", domainValues(EvidenceKind));
export const evidenceOriginEnum = pgEnum("evidence_origin", domainValues(EvidenceOrigin));
export const evidenceRelationshipEnum = pgEnum(
    "evidence_relationship",
    domainValues(EvidenceRelationship)
);
export const capabilityStatusEnum = pgEnum("capability_status", domainValues(CapabilityStatus));
export const capabilityResourceClassEnum = pgEnum(
    "capability_resource_class",
    domainValues(CapabilityResourceClass)
);
export const eventTypeEnum = pgEnum("event_type", domainValues(EventType));

const timestamps = {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const labs = pgTable(
    "labs",
    {
        id: text("id").primaryKey(),
        goal: text("goal").notNull(),
        input: jsonb("input").$type<TaskInput>().notNull(),
        state: labStateEnum("state").notNull().default(LabState.RUNNING),
        stateReason: text("state_reason"),
        workspacePath: text("workspace_path").notNull(),
        startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
        hibernatedAt: timestamp("hibernated_at", { withTimezone: true }),
        completedAt: timestamp("completed_at", { withTimezone: true }),
        stoppedAt: timestamp("stopped_at", { withTimezone: true }),
        ...timestamps
    },
    (table) => [index("labs_state_idx").on(table.state)]
);

export const branches = pgTable(
    "branches",
    {
        id: text("id").primaryKey(),
        labId: text("lab_id")
            .notNull()
            .references(() => labs.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        approach: text("approach").notNull(),
        status: branchStatusEnum("status").notNull().default(BranchStatus.ACTIVE),
        lane: schedulerLaneEnum("lane").notNull(),
        isolated: boolean("isolated").notNull().default(true),
        closedReason: text("closed_reason"),
        ...timestamps
    },
    (table) => [index("branches_lab_status_idx").on(table.labId, table.status)]
);

export const tasks = pgTable(
    "tasks",
    {
        id: text("id").primaryKey(),
        labId: text("lab_id")
            .notNull()
            .references(() => labs.id, { onDelete: "cascade" }),
        branchId: text("branch_id")
            .notNull()
            .references(() => branches.id, { onDelete: "cascade" }),
        objective: text("objective").notNull(),
        contextRefs: jsonb("context_refs").$type<string[]>().notNull().default([]),
        status: taskStatusEnum("status").notNull().default(InternalTaskStatus.QUEUED),
        role: agentRoleEnum("role").notNull(),
        lane: schedulerLaneEnum("lane").notNull(),
        priority: integer("priority").notNull().default(0),
        attempt: integer("attempt").notNull().default(1),
        availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
        leaseOwner: text("lease_owner"),
        leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
        lastError: text("last_error"),
        ...timestamps
    },
    (table) => [
        index("tasks_lease_candidate_idx").on(
            table.labId,
            table.status,
            table.lane,
            table.availableAt,
            table.priority
        ),
        index("tasks_expired_lease_idx").on(table.status, table.leaseExpiresAt)
    ]
);

export const attempts = pgTable(
    "attempts",
    {
        id: text("id").primaryKey(),
        taskId: text("task_id")
            .notNull()
            .references(() => tasks.id, { onDelete: "cascade" }),
        attemptNumber: integer("attempt_number").notNull(),
        workerId: text("worker_id").notNull(),
        status: attemptStatusEnum("status").notNull().default(AttemptStatus.PLANNED),
        command: text("command"),
        cwd: text("cwd"),
        inputs: jsonb("inputs").$type<Record<string, unknown>>().notNull().default({}),
        environment: jsonb("environment").$type<Record<string, string>>().notNull().default({}),
        stdoutPath: text("stdout_path"),
        stderrPath: text("stderr_path"),
        outputHash: text("output_hash"),
        exitCode: integer("exit_code"),
        error: text("error"),
        reconciliationKey: text("reconciliation_key"),
        externalEffect: externalEffectEnum("external_effect")
            .notNull()
            .default(ExternalEffect.NONE),
        startedAt: timestamp("started_at", { withTimezone: true }),
        finishedAt: timestamp("finished_at", { withTimezone: true }),
        ...timestamps
    },
    (table) => [
        uniqueIndex("attempts_task_number_unique").on(table.taskId, table.attemptNumber),
        uniqueIndex("attempts_reconciliation_key_unique").on(table.reconciliationKey),
        index("attempts_running_idx").on(table.status, table.taskId)
    ]
);

export const claims = pgTable(
    "claims",
    {
        id: text("id").primaryKey(),
        labId: text("lab_id")
            .notNull()
            .references(() => labs.id, { onDelete: "cascade" }),
        branchId: text("branch_id")
            .notNull()
            .references(() => branches.id, { onDelete: "cascade" }),
        statement: text("statement").notNull(),
        status: claimStatusEnum("status").notNull().default(ClaimStatus.PROPOSED),
        universal: boolean("universal").notNull().default(false),
        stale: boolean("stale").notNull().default(false),
        ...timestamps
    },
    (table) => [index("claims_lab_status_idx").on(table.labId, table.status)]
);

export const claimDependencies = pgTable(
    "claim_dependencies",
    {
        claimId: text("claim_id")
            .notNull()
            .references(() => claims.id, { onDelete: "cascade" }),
        dependencyId: text("dependency_id")
            .notNull()
            .references(() => claims.id, { onDelete: "cascade" })
    },
    (table) => [
        primaryKey({ columns: [table.claimId, table.dependencyId] }),
        index("claim_dependencies_dependency_idx").on(table.dependencyId)
    ]
);

export const evidence = pgTable(
    "evidence",
    {
        id: text("id").primaryKey(),
        labId: text("lab_id")
            .notNull()
            .references(() => labs.id, { onDelete: "cascade" }),
        sourceBranchId: text("source_branch_id")
            .notNull()
            .references(() => branches.id, { onDelete: "cascade" }),
        attemptId: text("attempt_id").references(() => attempts.id, { onDelete: "set null" }),
        kind: evidenceKindEnum("kind").notNull(),
        origin: evidenceOriginEnum("origin").notNull(),
        fingerprint: text("fingerprint").notNull(),
        runId: text("run_id"),
        artifactPath: text("artifact_path"),
        artifactHash: text("artifact_hash"),
        summary: text("summary").notNull(),
        independent: boolean("independent").notNull().default(false),
        valid: boolean("valid").notNull().default(true),
        complete: boolean("complete").notNull().default(true),
        reproducible: boolean("reproducible").notNull().default(false),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [
        uniqueIndex("evidence_lab_fingerprint_unique").on(table.labId, table.fingerprint),
        index("evidence_attempt_idx").on(table.attemptId)
    ]
);

export const claimEvidence = pgTable(
    "claim_evidence",
    {
        claimId: text("claim_id")
            .notNull()
            .references(() => claims.id, { onDelete: "cascade" }),
        evidenceId: text("evidence_id")
            .notNull()
            .references(() => evidence.id, { onDelete: "cascade" }),
        relationship: evidenceRelationshipEnum("relationship").notNull()
    },
    (table) => [
        primaryKey({ columns: [table.claimId, table.evidenceId] }),
        index("claim_evidence_evidence_idx").on(table.evidenceId)
    ]
);

export const events = pgTable(
    "events",
    {
        sequence: bigint("sequence", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
        id: text("id").notNull(),
        labId: text("lab_id")
            .notNull()
            .references(() => labs.id, { onDelete: "cascade" }),
        type: eventTypeEnum("type").notNull(),
        payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
        occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [
        uniqueIndex("events_id_unique").on(table.id),
        index("events_lab_sequence_idx").on(table.labId, table.sequence)
    ]
);

export const runtimeCheckpoints = pgTable(
    "runtime_checkpoints",
    {
        labId: text("lab_id")
            .primaryKey()
            .references(() => labs.id, { onDelete: "cascade" }),
        revision: bigint("revision", { mode: "number" }).notNull().default(1),
        snapshot: jsonb("snapshot").$type<StatusSnapshot>().notNull(),
        evidence: jsonb("evidence").$type<Evidence[]>().notNull().default([]),
        lastEventSequence: bigint("last_event_sequence", { mode: "number" }),
        persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [index("runtime_checkpoints_persisted_at_idx").on(table.persistedAt)]
);

export const capabilityRequests = pgTable(
    "capability_requests",
    {
        id: text("id").primaryKey(),
        labId: text("lab_id")
            .notNull()
            .references(() => labs.id, { onDelete: "cascade" }),
        branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
        need: text("need").notNull(),
        resourceClass: capabilityResourceClassEnum("resource_class").notNull(),
        reason: text("reason").notNull(),
        provisioningHint: text("provisioning_hint").notNull(),
        status: capabilityStatusEnum("status").notNull().default(CapabilityStatus.OPEN),
        resourceReference: text("resource_reference"),
        providedAt: timestamp("provided_at", { withTimezone: true }),
        ...timestamps
    },
    (table) => [index("capability_requests_lab_status_idx").on(table.labId, table.status)]
);
