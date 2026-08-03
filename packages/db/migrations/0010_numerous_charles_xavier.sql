ALTER TABLE "evidence" ALTER COLUMN "kind" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."evidence_kind";--> statement-breakpoint
CREATE TYPE "public"."evidence_kind" AS ENUM('experiment', 'artifact', 'counterexample', 'verifier_result');--> statement-breakpoint
ALTER TABLE "evidence" ALTER COLUMN "kind" SET DATA TYPE "public"."evidence_kind" USING "kind"::"public"."evidence_kind";--> statement-breakpoint
ALTER TABLE "evidence" ALTER COLUMN "origin" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."evidence_origin";--> statement-breakpoint
CREATE TYPE "public"."evidence_origin" AS ENUM('empirical', 'model_judgement', 'verifier');--> statement-breakpoint
ALTER TABLE "evidence" ALTER COLUMN "origin" SET DATA TYPE "public"."evidence_origin" USING "origin"::"public"."evidence_origin";--> statement-breakpoint
ALTER TABLE "claim_evidence" ALTER COLUMN "relationship" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."evidence_relationship";--> statement-breakpoint
CREATE TYPE "public"."evidence_relationship" AS ENUM('supports', 'contradicts');--> statement-breakpoint
ALTER TABLE "claim_evidence" ALTER COLUMN "relationship" SET DATA TYPE "public"."evidence_relationship" USING "relationship"::"public"."evidence_relationship";