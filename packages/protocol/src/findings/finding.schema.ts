import { z } from "zod";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { FindingStatus } from "#src/findings/finding-status.const";

export const FindingStatusSchema = z.enum(FindingStatus);

/**
 * What a researcher says it found. `claim` is the assertion a verifier will read and check on its
 * own; `work` is the researcher's own account of how it got there. Artifact paths are kept as a
 * pointer for a human who wants to look, never as a condition for the finding to count — plenty of
 * real discoveries are a paragraph of reasoning about a system, not a file on disk.
 */
export const FindingSchema = z.object({
    id: IdentifierSchema,
    lead_id: IdentifierSchema,
    run_id: IdentifierSchema,
    claim: z.string().trim().min(1),
    work: z.string().trim().min(1),
    artifact_paths: z.array(z.string().trim().min(1)).default([]),
    status: FindingStatusSchema.default(FindingStatus.UNVERIFIED),
    created_at: z.iso.datetime()
});
