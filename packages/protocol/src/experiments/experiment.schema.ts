import { z } from "zod";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { ExperimentStatus } from "#src/experiments/experiment-status.const";
import { ExternalEffect } from "#src/experiments/external-effect.const";

export const ExperimentStatusSchema = z.enum(ExperimentStatus);

export const ExperimentSchema = z.object({
    id: IdentifierSchema,
    task_id: IdentifierSchema,
    branch_id: IdentifierSchema,
    hypothesis: z.string().trim().min(1),
    evaluator: z.string().trim().min(1),
    command: z.string().trim().min(1),
    cwd: z.string(),
    status: ExperimentStatusSchema,
    exit_code: z.int().nullable().optional(),
    error: z.string().trim().min(1).optional(),
    started_at: z.iso.datetime().optional(),
    finished_at: z.iso.datetime().optional(),
    output_path: z.string().optional(),
    output_hash: z.string().optional(),
    external_effect: z.enum(ExternalEffect).optional(),
    reconciliation_key: z.string().trim().min(1).optional(),
    execution_fingerprint: z
        .string()
        .regex(/^[a-f0-9]{64}$/u)
        .optional()
});
