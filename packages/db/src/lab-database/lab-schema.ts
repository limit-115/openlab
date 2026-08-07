import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import { AgentEffortLevel, AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { AgentRole } from "@openlab/protocol/agents/agent-role.const";
import { CapabilityStatus } from "@openlab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@openlab/protocol/findings/finding-status.const";
import { domainValues } from "@openlab/protocol/finite-domain/finite-domain-values";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import type { InvestigationInput } from "@openlab/protocol/investigation-input/investigation-input.types";
import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import type { LabSettings } from "@openlab/protocol/lab-settings/lab-settings.types";
import { LeadStatus } from "@openlab/protocol/leads/lead-status.const";
import type { NotificationSettings } from "@openlab/protocol/operator-notifications/notification-settings.types";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * The moment a row was written, in the milliseconds the timestamp columns are stored as. SQLite has
 * no `now()`, and a bare `unixepoch()` rounds to the whole second, so the sub-second reading is what
 * gets scaled.
 */
const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

const timestamps = {
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now)
};

export const investigations = sqliteTable(
    "investigations",
    {
        id: text("id").primaryKey(),
        goal: text("goal").notNull(),
        input: text("input", { mode: "json" }).$type<InvestigationInput>().notNull(),
        state: text("state", { enum: domainValues(InvestigationState) })
            .notNull()
            .default(InvestigationState.RUNNING),
        stateReason: text("state_reason"),
        workspacePath: text("workspace_path").notNull(),
        startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().default(now),
        hibernatedAt: integer("hibernated_at", { mode: "timestamp_ms" }),
        breakthroughAt: integer("breakthrough_at", { mode: "timestamp_ms" }),
        stoppedAt: integer("stopped_at", { mode: "timestamp_ms" }),
        ...timestamps
    },
    (table) => [index("labs_state_idx").on(table.state)]
);

/** A director's lead on where the goal might be reachable. One researcher takes one lead. */
export const leads = sqliteTable(
    "leads",
    {
        id: text("id").primaryKey(),
        investigationId: text("investigation_id")
            .notNull()
            .references(() => investigations.id, { onDelete: "cascade" }),
        cycle: integer("cycle").notNull().default(0),
        statement: text("statement").notNull(),
        rationale: text("rationale").notNull(),
        status: text("status", { enum: domainValues(LeadStatus) })
            .notNull()
            .default(LeadStatus.OPEN),
        outcome: text("outcome"),
        ...timestamps
    },
    (table) => [index("leads_investigation_status_idx").on(table.investigationId, table.status)]
);

/** One agent session. Replaces the agent, task, attempt and experiment records it used to take. */
export const agentRuns = sqliteTable(
    "agent_runs",
    {
        id: text("id").primaryKey(),
        investigationId: text("investigation_id")
            .notNull()
            .references(() => investigations.id, { onDelete: "cascade" }),
        leadId: text("lead_id").references(() => leads.id, {
            onDelete: "cascade"
        }),
        role: text("role", { enum: domainValues(AgentRole) }).notNull(),
        objective: text("objective").notNull(),
        status: text("status", { enum: domainValues(AgentRunStatus) })
            .notNull()
            .default(AgentRunStatus.RUNNING),
        harness: text("harness", { enum: domainValues(AgentHarnessKind) }),
        model: text("model"),
        effort: text("effort", { enum: domainValues(AgentEffortLevel) }),
        cwd: text("cwd").notNull(),
        exitCode: integer("exit_code"),
        error: text("error"),
        manifestPath: text("manifest_path"),
        startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().default(now),
        finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
        ...timestamps
    },
    (table) => [
        index("agent_runs_investigation_status_idx").on(table.investigationId, table.status),
        index("agent_runs_lead_idx").on(table.leadId)
    ]
);

/** What a researcher says it found. Artifacts are a pointer for a reader, never a precondition. */
export const findings = sqliteTable(
    "findings",
    {
        id: text("id").primaryKey(),
        investigationId: text("investigation_id")
            .notNull()
            .references(() => investigations.id, { onDelete: "cascade" }),
        leadId: text("lead_id")
            .notNull()
            .references(() => leads.id, { onDelete: "cascade" }),
        runId: text("run_id")
            .notNull()
            .references(() => agentRuns.id, { onDelete: "cascade" }),
        claim: text("claim").notNull(),
        work: text("work").notNull(),
        artifactPaths: text("artifact_paths", { mode: "json" })
            .$type<string[]>()
            .notNull()
            .default([]),
        status: text("status", { enum: domainValues(FindingStatus) })
            .notNull()
            .default(FindingStatus.UNVERIFIED),
        createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now)
    },
    (table) => [index("findings_investigation_status_idx").on(table.investigationId, table.status)]
);

/** An independent verifier's prose answer about one finding. */
export const verdicts = sqliteTable(
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
        confirmed: integer("confirmed", { mode: "boolean" }).notNull(),
        reasoning: text("reasoning").notNull(),
        createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now)
    },
    (table) => [index("verdicts_finding_idx").on(table.findingId)]
);

export const events = sqliteTable(
    "events",
    {
        sequence: integer("sequence").primaryKey({ autoIncrement: true }),
        id: text("id").notNull(),
        investigationId: text("investigation_id")
            .notNull()
            .references(() => investigations.id, { onDelete: "cascade" }),
        type: text("type", { enum: domainValues(EventType) }).notNull(),
        payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
        occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull().default(now)
    },
    (table) => [
        uniqueIndex("events_id_unique").on(table.id),
        index("events_investigation_sequence_idx").on(table.investigationId, table.sequence)
    ]
);

export const runtimeCheckpoints = sqliteTable(
    "runtime_checkpoints",
    {
        investigationId: text("investigation_id")
            .primaryKey()
            .references(() => investigations.id, { onDelete: "cascade" }),
        revision: integer("revision").notNull().default(1),
        snapshot: text("snapshot", { mode: "json" }).$type<StatusSnapshot>().notNull(),
        lastEventSequence: integer("last_event_sequence"),
        persistedAt: integer("persisted_at", { mode: "timestamp_ms" }).notNull().default(now)
    },
    (table) => [index("runtime_checkpoints_persisted_at_idx").on(table.persistedAt)]
);

/**
 * What the operator set for the lab itself. One database is one lab, so this table holds one row;
 * an absent row is a lab that has never been configured rather than a broken one.
 */
export const labSettings = sqliteTable("lab_settings", {
    id: text("id").primaryKey(),
    settings: text("settings", { mode: "json" }).$type<LabSettings>().notNull(),
    ...timestamps
});

/**
 * Who the lab tells about the moments worth reading, and where. Kept apart from the settings the
 * lab dispatches by, because these carry the credential a channel authenticates with: the two
 * documents are read by different callers under different rules, and only one of them is served
 * back whole.
 */
export const notificationSettings = sqliteTable("notification_settings", {
    id: text("id").primaryKey(),
    settings: text("settings", { mode: "json" }).$type<NotificationSettings>().notNull(),
    ...timestamps
});

export const capabilityRequests = sqliteTable(
    "capability_requests",
    {
        id: text("id").primaryKey(),
        investigationId: text("investigation_id")
            .notNull()
            .references(() => investigations.id, { onDelete: "cascade" }),
        leadId: text("lead_id").references(() => leads.id, {
            onDelete: "set null"
        }),
        need: text("need").notNull(),
        reason: text("reason").notNull(),
        provisioningHint: text("provisioning_hint").notNull(),
        selfProvisioningAttempt: text("self_provisioning_attempt"),
        blocking: integer("blocking", { mode: "boolean" }).notNull().default(false),
        status: text("status", { enum: domainValues(CapabilityStatus) })
            .notNull()
            .default(CapabilityStatus.OPEN),
        answer: text("answer"),
        answeredAt: integer("answered_at", { mode: "timestamp_ms" }),
        ...timestamps
    },
    (table) => [
        index("capability_requests_investigation_status_idx").on(
            table.investigationId,
            table.status
        )
    ]
);
