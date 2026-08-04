import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { AgentEffortLevel, AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AssumptionStatus } from "@lab/protocol/assumptions/assumption-status.const";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@lab/protocol/findings/finding-status.const";
import { domainValues } from "@lab/protocol/finite-domain/finite-domain-values";
import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import type { InvestigationInput } from "@lab/protocol/investigation-input/investigation-input.types";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import {
    bigint,
    boolean,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex
} from "drizzle-orm/pg-core";

export const investigationStateEnum = pgEnum(
    "investigation_state",
    domainValues(InvestigationState)
);
export const agentRoleEnum = pgEnum("agent_role", domainValues(AgentRole));
export const agentRunStatusEnum = pgEnum("agent_run_status", domainValues(AgentRunStatus));
export const agentHarnessEnum = pgEnum("agent_harness", domainValues(AgentHarnessKind));
export const agentEffortEnum = pgEnum("agent_effort", domainValues(AgentEffortLevel));
export const assumptionStatusEnum = pgEnum("assumption_status", domainValues(AssumptionStatus));
export const findingStatusEnum = pgEnum("finding_status", domainValues(FindingStatus));
export const capabilityStatusEnum = pgEnum("capability_status", domainValues(CapabilityStatus));
export const eventTypeEnum = pgEnum("event_type", domainValues(EventType));

const timestamps = {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const investigations = pgTable(
    "investigations",
    {
        id: text("id").primaryKey(),
        goal: text("goal").notNull(),
        input: jsonb("input").$type<InvestigationInput>().notNull(),
        state: investigationStateEnum("state").notNull().default(InvestigationState.RUNNING),
        stateReason: text("state_reason"),
        workspacePath: text("workspace_path").notNull(),
        startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
        hibernatedAt: timestamp("hibernated_at", { withTimezone: true }),
        breakthroughAt: timestamp("breakthrough_at", { withTimezone: true }),
        stoppedAt: timestamp("stopped_at", { withTimezone: true }),
        ...timestamps
    },
    (table) => [index("labs_state_idx").on(table.state)]
);

/** A director's bet on where the goal might be reachable. One researcher takes one bet. */
export const assumptions = pgTable(
    "assumptions",
    {
        id: text("id").primaryKey(),
        investigationId: text("investigation_id")
            .notNull()
            .references(() => investigations.id, { onDelete: "cascade" }),
        cycle: integer("cycle").notNull().default(0),
        statement: text("statement").notNull(),
        rationale: text("rationale").notNull(),
        status: assumptionStatusEnum("status").notNull().default(AssumptionStatus.OPEN),
        outcome: text("outcome"),
        ...timestamps
    },
    (table) => [
        index("assumptions_investigation_status_idx").on(table.investigationId, table.status)
    ]
);

/** One agent session. Replaces the agent, task, attempt and experiment records it used to take. */
export const agentRuns = pgTable(
    "agent_runs",
    {
        id: text("id").primaryKey(),
        investigationId: text("investigation_id")
            .notNull()
            .references(() => investigations.id, { onDelete: "cascade" }),
        assumptionId: text("assumption_id").references(() => assumptions.id, {
            onDelete: "cascade"
        }),
        role: agentRoleEnum("role").notNull(),
        objective: text("objective").notNull(),
        status: agentRunStatusEnum("status").notNull().default(AgentRunStatus.RUNNING),
        harness: agentHarnessEnum("harness"),
        model: text("model"),
        effort: agentEffortEnum("effort"),
        cwd: text("cwd").notNull(),
        exitCode: integer("exit_code"),
        error: text("error"),
        manifestPath: text("manifest_path"),
        startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
        finishedAt: timestamp("finished_at", { withTimezone: true }),
        ...timestamps
    },
    (table) => [
        index("agent_runs_investigation_status_idx").on(table.investigationId, table.status),
        index("agent_runs_assumption_idx").on(table.assumptionId)
    ]
);

/** What a researcher says it found. Artifacts are a pointer for a reader, never a precondition. */
export const findings = pgTable(
    "findings",
    {
        id: text("id").primaryKey(),
        investigationId: text("investigation_id")
            .notNull()
            .references(() => investigations.id, { onDelete: "cascade" }),
        assumptionId: text("assumption_id")
            .notNull()
            .references(() => assumptions.id, { onDelete: "cascade" }),
        runId: text("run_id")
            .notNull()
            .references(() => agentRuns.id, { onDelete: "cascade" }),
        claim: text("claim").notNull(),
        work: text("work").notNull(),
        artifactPaths: jsonb("artifact_paths").$type<string[]>().notNull().default([]),
        status: findingStatusEnum("status").notNull().default(FindingStatus.UNVERIFIED),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [index("findings_investigation_status_idx").on(table.investigationId, table.status)]
);

/** An independent verifier's prose answer about one finding. */
export const verdicts = pgTable(
    "verdicts",
    {
        id: text("id").primaryKey(),
        investigationId: text("investigation_id")
            .notNull()
            .references(() => investigations.id, { onDelete: "cascade" }),
        findingId: text("finding_id")
            .notNull()
            .references(() => findings.id, { onDelete: "cascade" }),
        runId: text("run_id")
            .notNull()
            .references(() => agentRuns.id, { onDelete: "cascade" }),
        confirmed: boolean("confirmed").notNull(),
        reasoning: text("reasoning").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [index("verdicts_finding_idx").on(table.findingId)]
);

export const events = pgTable(
    "events",
    {
        sequence: bigint("sequence", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
        id: text("id").notNull(),
        investigationId: text("investigation_id")
            .notNull()
            .references(() => investigations.id, { onDelete: "cascade" }),
        type: eventTypeEnum("type").notNull(),
        payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
        occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [
        uniqueIndex("events_id_unique").on(table.id),
        index("events_investigation_sequence_idx").on(table.investigationId, table.sequence)
    ]
);

export const runtimeCheckpoints = pgTable(
    "runtime_checkpoints",
    {
        investigationId: text("investigation_id")
            .primaryKey()
            .references(() => investigations.id, { onDelete: "cascade" }),
        revision: bigint("revision", { mode: "number" }).notNull().default(1),
        snapshot: jsonb("snapshot").$type<StatusSnapshot>().notNull(),
        lastEventSequence: bigint("last_event_sequence", { mode: "number" }),
        persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [index("runtime_checkpoints_persisted_at_idx").on(table.persistedAt)]
);

export const capabilityRequests = pgTable(
    "capability_requests",
    {
        id: text("id").primaryKey(),
        investigationId: text("investigation_id")
            .notNull()
            .references(() => investigations.id, { onDelete: "cascade" }),
        assumptionId: text("assumption_id").references(() => assumptions.id, {
            onDelete: "set null"
        }),
        need: text("need").notNull(),
        reason: text("reason").notNull(),
        provisioningHint: text("provisioning_hint").notNull(),
        selfProvisioningAttempt: text("self_provisioning_attempt"),
        blocking: boolean("blocking").notNull().default(false),
        status: capabilityStatusEnum("status").notNull().default(CapabilityStatus.OPEN),
        answer: text("answer"),
        answeredAt: timestamp("answered_at", { withTimezone: true }),
        ...timestamps
    },
    (table) => [
        index("capability_requests_investigation_status_idx").on(
            table.investigationId,
            table.status
        )
    ]
);
