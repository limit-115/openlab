ALTER TABLE "runtime_checkpoints" ADD COLUMN "evidence" jsonb DEFAULT '[]'::jsonb NOT NULL;
