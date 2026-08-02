CREATE TYPE "public"."agent_role" AS ENUM('director', 'researcher', 'critic', 'verifier');--> statement-breakpoint
CREATE TYPE "public"."attempt_status" AS ENUM('planned', 'running', 'succeeded', 'failed', 'timed_out', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."branch_status" AS ENUM('active', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."capability_status" AS ENUM('open', 'provided', 'obsolete');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('proposed', 'testing', 'supported', 'refuted', 'reproduced');--> statement-breakpoint
CREATE TYPE "public"."evidence_kind" AS ENUM('experiment', 'source', 'artifact', 'counterexample', 'verifier_result');--> statement-breakpoint
CREATE TYPE "public"."evidence_origin" AS ENUM('empirical', 'model_judgement', 'primary_source', 'verifier');--> statement-breakpoint
CREATE TYPE "public"."evidence_relationship" AS ENUM('supports', 'contradicts');--> statement-breakpoint
CREATE TYPE "public"."lab_state" AS ENUM('RUNNING', 'HIBERNATING', 'COMPLETED', 'STOPPED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."scheduler_lane" AS ENUM('promising', 'exploration', 'adversarial', 'reproduction');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('queued', 'leased', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"worker_id" text NOT NULL,
	"status" "attempt_status" DEFAULT 'planned' NOT NULL,
	"command" text,
	"cwd" text,
	"inputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"environment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stdout_path" text,
	"stderr_path" text,
	"output_hash" text,
	"exit_code" integer,
	"error" text,
	"reconciliation_key" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" text PRIMARY KEY NOT NULL,
	"lab_id" text NOT NULL,
	"title" text NOT NULL,
	"approach" text NOT NULL,
	"status" "branch_status" DEFAULT 'active' NOT NULL,
	"lane" "scheduler_lane" NOT NULL,
	"isolated" boolean DEFAULT true NOT NULL,
	"closed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"lab_id" text NOT NULL,
	"branch_id" text,
	"need" text NOT NULL,
	"reason" text NOT NULL,
	"provisioning_hint" text NOT NULL,
	"status" "capability_status" DEFAULT 'open' NOT NULL,
	"resource_reference" text,
	"provided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_dependencies" (
	"claim_id" text NOT NULL,
	"dependency_id" text NOT NULL,
	CONSTRAINT "claim_dependencies_claim_id_dependency_id_pk" PRIMARY KEY("claim_id","dependency_id")
);
--> statement-breakpoint
CREATE TABLE "claim_evidence" (
	"claim_id" text NOT NULL,
	"evidence_id" text NOT NULL,
	"relationship" "evidence_relationship" NOT NULL,
	CONSTRAINT "claim_evidence_claim_id_evidence_id_pk" PRIMARY KEY("claim_id","evidence_id")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY NOT NULL,
	"lab_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"statement" text NOT NULL,
	"status" "claim_status" DEFAULT 'proposed' NOT NULL,
	"universal" boolean DEFAULT false NOT NULL,
	"stale" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"sequence" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"lab_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"lab_id" text NOT NULL,
	"source_branch_id" text NOT NULL,
	"attempt_id" text,
	"kind" "evidence_kind" NOT NULL,
	"origin" "evidence_origin" NOT NULL,
	"fingerprint" text NOT NULL,
	"run_id" text,
	"artifact_path" text,
	"artifact_hash" text,
	"summary" text NOT NULL,
	"independent" boolean DEFAULT false NOT NULL,
	"valid" boolean DEFAULT true NOT NULL,
	"complete" boolean DEFAULT true NOT NULL,
	"reproducible" boolean DEFAULT false NOT NULL,
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
	"completed_at" timestamp with time zone,
	"stopped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"lab_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"objective" text NOT NULL,
	"context_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "task_status" DEFAULT 'queued' NOT NULL,
	"role" "agent_role" NOT NULL,
	"lane" "scheduler_lane" NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_requests" ADD CONSTRAINT "capability_requests_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_requests" ADD CONSTRAINT "capability_requests_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_dependencies" ADD CONSTRAINT "claim_dependencies_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_dependencies" ADD CONSTRAINT "claim_dependencies_dependency_id_claims_id_fk" FOREIGN KEY ("dependency_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_source_branch_id_branches_id_fk" FOREIGN KEY ("source_branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_task_number_unique" ON "attempts" USING btree ("task_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_reconciliation_key_unique" ON "attempts" USING btree ("reconciliation_key");--> statement-breakpoint
CREATE INDEX "attempts_running_idx" ON "attempts" USING btree ("status","task_id");--> statement-breakpoint
CREATE INDEX "branches_lab_status_idx" ON "branches" USING btree ("lab_id","status");--> statement-breakpoint
CREATE INDEX "capability_requests_lab_status_idx" ON "capability_requests" USING btree ("lab_id","status");--> statement-breakpoint
CREATE INDEX "claim_dependencies_dependency_idx" ON "claim_dependencies" USING btree ("dependency_id");--> statement-breakpoint
CREATE INDEX "claim_evidence_evidence_idx" ON "claim_evidence" USING btree ("evidence_id");--> statement-breakpoint
CREATE INDEX "claims_lab_status_idx" ON "claims" USING btree ("lab_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "events_id_unique" ON "events" USING btree ("id");--> statement-breakpoint
CREATE INDEX "events_lab_sequence_idx" ON "events" USING btree ("lab_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_lab_fingerprint_unique" ON "evidence" USING btree ("lab_id","fingerprint");--> statement-breakpoint
CREATE INDEX "evidence_attempt_idx" ON "evidence" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "labs_state_idx" ON "labs" USING btree ("state");--> statement-breakpoint
CREATE INDEX "tasks_lease_candidate_idx" ON "tasks" USING btree ("lab_id","status","lane","available_at","priority");--> statement-breakpoint
CREATE INDEX "tasks_expired_lease_idx" ON "tasks" USING btree ("status","lease_expires_at");