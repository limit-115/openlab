import { z } from "zod";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { EvidenceKind } from "#src/evidence/evidence-kind.const";
import { SourceEvidenceMetadataSchema } from "#src/evidence/source-evidence.schema";

export const EvidenceKindSchema = z.enum(EvidenceKind);

export const EvidenceSchema = z
    .object({
        id: IdentifierSchema,
        kind: EvidenceKindSchema,
        claim_id: IdentifierSchema,
        run_id: IdentifierSchema.optional(),
        artifact_path: z.string().optional(),
        artifact_hash: z.string().optional(),
        summary: z.string().trim().min(1),
        supports: z.boolean(),
        independent: z.boolean().default(false),
        source: SourceEvidenceMetadataSchema.optional(),
        created_at: z.iso.datetime()
    })
    .superRefine((evidence, context) => {
        if (evidence.kind === EvidenceKind.SOURCE && evidence.source === undefined) {
            context.addIssue({
                code: "custom",
                path: ["source"],
                message: "Source evidence requires daemon retrieval metadata"
            });
        }
        if (evidence.kind === EvidenceKind.SOURCE && evidence.supports) {
            context.addIssue({
                code: "custom",
                path: ["supports"],
                message: "A citation cannot independently support a claim"
            });
        }
        if (evidence.kind !== EvidenceKind.SOURCE && evidence.source !== undefined) {
            context.addIssue({
                code: "custom",
                path: ["source"],
                message: "Only source evidence may include retrieval metadata"
            });
        }
    });
