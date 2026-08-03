CREATE TYPE "public"."agent_effort" AS ENUM('low', 'medium', 'high', 'xhigh', 'max');--> statement-breakpoint
CREATE TYPE "public"."agent_harness" AS ENUM('codex', 'claude', 'glm');--> statement-breakpoint
CREATE TYPE "public"."agent_role" AS ENUM('director', 'researcher', 'verifier');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('running', 'succeeded', 'failed', 'timed_out', 'cancelled', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."assumption_status" AS ENUM('open', 'researching', 'exhausted', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."capability_status" AS ENUM('open', 'answered');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('lab.started', 'lab.recovered', 'lab.state_changed', 'lab.woken', 'lab.hibernated', 'lab.stopped', 'lab.failed', 'harness.preflight_succeeded', 'harness.preflight_failed', 'assumptions.proposed', 'assumption.research_started', 'assumption.exhausted', 'assumption.confirmed', 'run.started', 'run.succeeded', 'run.failed', 'run.timed_out', 'run.cancelled', 'run.blocked', 'finding.claimed', 'verification.started', 'finding.confirmed', 'finding.refuted', 'breakthrough.recorded', 'capability.requested', 'capability.answered', 'report.generated');--> statement-breakpoint
CREATE TYPE "public"."finding_status" AS ENUM('unverified', 'confirmed', 'refuted');--> statement-breakpoint
CREATE TYPE "public"."lab_state" AS ENUM('RUNNING', 'BREAKTHROUGH', 'HIBERNATING', 'STOPPED', 'FAILED');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"lab_id" text NOT NULL,
	"assumption_id" text,
	"role" "agent_role" NOT NULL,
	"objective" text NOT NULL,
	"status" "agent_run_status" DEFAULT 'running' NOT NULL,
	"harness" "agent_harness",
	"model" text,
	"effort" "agent_effort",
	"cwd" text NOT NULL,
	"exit_code" integer,
	"error" text,
	"manifest_path" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assumptions" (
	"id" text PRIMARY KEY NOT NULL,
	"lab_id" text NOT NULL,
	"cycle" integer DEFAULT 0 NOT NULL,
	"statement" text NOT NULL,
	"rationale" text NOT NULL,
	"status" "assumption_status" DEFAULT 'open' NOT NULL,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"lab_id" text NOT NULL,
	"assumption_id" text,
	"need" text NOT NULL,
	"reason" text NOT NULL,
	"provisioning_hint" text NOT NULL,
	"self_provisioning_attempt" text,
	"blocking" boolean DEFAULT false NOT NULL,
	"status" "capability_status" DEFAULT 'open' NOT NULL,
	"answer" text,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"sequence" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"lab_id" text NOT NULL,
	"type" "event_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" text PRIMARY KEY NOT NULL,
	"lab_id" text NOT NULL,
	"assumption_id" text NOT NULL,
	"run_id" text NOT NULL,
	"claim" text NOT NULL,
	"work" text NOT NULL,
	"artifact_paths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "finding_status" DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labs" (
	"id" text PRIMARY KEY NOT NULL,
	"goal" text NOT NULL,
	"input" jsonb NOT NULL,
	"state" "lab_state" DEFAULT 'RUNNING' NOT NULL,
	"state_reason" text,
	"workspace_path" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hibernated_at" timestamp with time zone,
	"breakthrough_at" timestamp with time zone,
	"stopped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runtime_checkpoints" (
	"lab_id" text PRIMARY KEY NOT NULL,
	"revision" bigint DEFAULT 1 NOT NULL,
	"snapshot" jsonb NOT NULL,
	"last_event_sequence" bigint,
	"persisted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verdicts" (
	"id" text PRIMARY KEY NOT NULL,
	"lab_id" text NOT NULL,
	"finding_id" text NOT NULL,
	"run_id" text NOT NULL,
	"confirmed" boolean NOT NULL,
	"reasoning" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_assumption_id_assumptions_id_fk" FOREIGN KEY ("assumption_id") REFERENCES "public"."assumptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assumptions" ADD CONSTRAINT "assumptions_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_requests" ADD CONSTRAINT "capability_requests_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_requests" ADD CONSTRAINT "capability_requests_assumption_id_assumptions_id_fk" FOREIGN KEY ("assumption_id") REFERENCES "public"."assumptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_assumption_id_assumptions_id_fk" FOREIGN KEY ("assumption_id") REFERENCES "public"."assumptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runtime_checkpoints" ADD CONSTRAINT "runtime_checkpoints_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_lab_status_idx" ON "agent_runs" USING btree ("lab_id","status");--> statement-breakpoint
CREATE INDEX "agent_runs_assumption_idx" ON "agent_runs" USING btree ("assumption_id");--> statement-breakpoint
CREATE INDEX "assumptions_lab_status_idx" ON "assumptions" USING btree ("lab_id","status");--> statement-breakpoint
CREATE INDEX "capability_requests_lab_status_idx" ON "capability_requests" USING btree ("lab_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "events_id_unique" ON "events" USING btree ("id");--> statement-breakpoint
CREATE INDEX "events_lab_sequence_idx" ON "events" USING btree ("lab_id","sequence");--> statement-breakpoint
CREATE INDEX "findings_lab_status_idx" ON "findings" USING btree ("lab_id","status");--> statement-breakpoint
CREATE INDEX "labs_state_idx" ON "labs" USING btree ("state");--> statement-breakpoint
CREATE INDEX "runtime_checkpoints_persisted_at_idx" ON "runtime_checkpoints" USING btree ("persisted_at");--> statement-breakpoint
CREATE INDEX "verdicts_finding_idx" ON "verdicts" USING btree ("finding_id");