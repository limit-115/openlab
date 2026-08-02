import { z } from "zod";
import { ClaimStatus } from "#src/claims/claim-status.const";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";

export const ClaimStatusSchema = z.enum(ClaimStatus);

export const ClaimSchema = z.object({
    id: IdentifierSchema,
    branch_id: IdentifierSchema,
    statement: z.string().trim().min(1),
    status: ClaimStatusSchema,
    assumption_ids: z.array(IdentifierSchema).default([]),
    supporting_evidence_ids: z.array(IdentifierSchema).default([]),
    contradicting_evidence_ids: z.array(IdentifierSchema).default([]),
    stale: z.boolean().default(false),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime()
});
