CREATE TYPE "public"."capability_resource_class" AS ENUM('credential', 'account', 'private_data', 'hardware', 'authorization');--> statement-breakpoint
--- Capability rows are a projection of the runtime checkpoint and carry no resource class yet.
--- Inventing one would fabricate provenance, so the projection is cleared and rebuilt on the next
--- checkpoint commit instead.
DELETE FROM "capability_requests";--> statement-breakpoint
ALTER TABLE "capability_requests" ADD COLUMN "resource_class" "capability_resource_class" NOT NULL;
