import type { z } from "zod";
import type { AssumptionSchema } from "#src/assumptions/assumption.schema";

export type Assumption = z.infer<typeof AssumptionSchema>;
