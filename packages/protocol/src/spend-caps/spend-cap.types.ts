import type { z } from "zod";
import type { SpendCapSchema, SpendCapsSchema } from "#src/spend-caps/spend-cap.schema";

export type SpendCap = z.infer<typeof SpendCapSchema>;
export type SpendCaps = z.infer<typeof SpendCapsSchema>;
