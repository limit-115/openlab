import { z } from "zod";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { EvidenceKind } from "#src/evidence/evidence-kind.const";

export const EvidenceKindSchema = z.enum(EvidenceKind);

export const EvidenceSchema = z.object({
    id: IdentifierSchema,
    kind: EvidenceKindSchema,
    claim_id: IdentifierSchema,
    run_id: IdentifierSchema.optional(),
    artifact_path: z.string().optional(),
    artifact_hash: z.string().optional(),
    summary: z.string().trim().min(1),
    supports: z.boolean(),
    independent: z.boolean().default(false),
    created_at: z.iso.datetime()
});
