ALTER TYPE "public"."evidence_origin" ADD VALUE 'daemon_fetched_source' BEFORE 'empirical';--> statement-breakpoint
ALTER TYPE "public"."evidence_relationship" ADD VALUE 'cites' BEFORE 'supports';