CREATE TABLE "runtime_checkpoints" (
	"lab_id" text PRIMARY KEY NOT NULL,
	"revision" bigint DEFAULT 1 NOT NULL,
	"snapshot" jsonb NOT NULL,
	"last_event_sequence" bigint,
	"persisted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "runtime_checkpoints" ADD CONSTRAINT "runtime_checkpoints_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "runtime_checkpoints_persisted_at_idx" ON "runtime_checkpoints" USING btree ("persisted_at");