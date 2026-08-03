--- Capability rows and their events describe a vocabulary that no longer exists, and the runs they
--- belong to are not being carried forward. Clearing them beats inventing an answer nobody gave.
DELETE FROM "capability_requests";--> statement-breakpoint
DELETE FROM "events" WHERE "type" IN ('capability.provided', 'capability.obsolete');--> statement-breakpoint
ALTER TABLE "capability_requests" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "capability_requests" ALTER COLUMN "status" SET DEFAULT 'open'::text;--> statement-breakpoint
DROP TYPE "public"."capability_status";--> statement-breakpoint
CREATE TYPE "public"."capability_status" AS ENUM('open', 'answered');--> statement-breakpoint
ALTER TABLE "capability_requests" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."capability_status";--> statement-breakpoint
ALTER TABLE "capability_requests" ALTER COLUMN "status" SET DATA TYPE "public"."capability_status" USING "status"::"public"."capability_status";--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."event_type";--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('lab.started', 'lab.recovered', 'lab.state_changed', 'lab.woken', 'lab.hibernated', 'lab.completed', 'lab.stopped', 'lab.failed', 'harness.preflight_succeeded', 'harness.preflight_failed', 'harness.run_started', 'harness.run_succeeded', 'harness.run_failed', 'harness.run_timed_out', 'harness.run_cancelled', 'goal.operationalized', 'evaluator.precommitted', 'branch.created', 'branch.paused', 'branch.closed', 'task.queued', 'task.leased', 'task.started', 'task.succeeded', 'task.failed', 'task.cancelled', 'attempt.planned', 'attempt.started', 'attempt.succeeded', 'attempt.failed', 'attempt.timed_out', 'attempt.cancelled', 'claim.proposed', 'claim.testing', 'claim.supported', 'claim.refuted', 'claim.reproduced', 'claim.stale', 'evidence.recorded', 'experiment.planned', 'experiment.started', 'experiment.succeeded', 'experiment.failed', 'experiment.timed_out', 'experiment.cancelled', 'verifier.verdict_recorded', 'frontier.updated', 'plateau.confirmed', 'capability.requested', 'capability.answered', 'report.generated', 'result.generated');--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "type" SET DATA TYPE "public"."event_type" USING "type"::"public"."event_type";--> statement-breakpoint
ALTER TABLE "capability_requests" ADD COLUMN "self_provisioning_attempt" text;--> statement-breakpoint
ALTER TABLE "capability_requests" ADD COLUMN "blocking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "capability_requests" ADD COLUMN "answer" text;--> statement-breakpoint
ALTER TABLE "capability_requests" ADD COLUMN "answered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "capability_requests" DROP COLUMN "resource_class";--> statement-breakpoint
ALTER TABLE "capability_requests" DROP COLUMN "resource_reference";--> statement-breakpoint
ALTER TABLE "capability_requests" DROP COLUMN "provided_at";--> statement-breakpoint
DROP TYPE "public"."capability_resource_class";
