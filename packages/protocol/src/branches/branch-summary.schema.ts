import { z } from "zod";
import { BranchStatus } from "#src/branches/branch-status.const";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";

export const BranchSummarySchema = z.object({
    id: IdentifierSchema,
    title: z.string().min(1),
    approach: z.string().min(1),
    status: z.enum(BranchStatus),
    progress: z.string().default("")
});
