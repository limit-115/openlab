import type { z } from "zod";
import type { ClaimSchema } from "#src/claims/claim.schema";

export type Claim = z.infer<typeof ClaimSchema>;
