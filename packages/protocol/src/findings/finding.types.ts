import type { z } from "zod";
import type { FindingSchema } from "#src/findings/finding.schema";

export type Finding = z.infer<typeof FindingSchema>;
