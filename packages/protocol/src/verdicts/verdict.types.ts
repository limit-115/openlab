import type { z } from "zod";
import type { VerdictSchema } from "#src/verdicts/verdict.schema";

export type Verdict = z.infer<typeof VerdictSchema>;
