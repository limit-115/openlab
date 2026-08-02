import type { z } from "zod";
import type { EvidenceSchema } from "#src/evidence/evidence.schema";

export type Evidence = z.infer<typeof EvidenceSchema>;
