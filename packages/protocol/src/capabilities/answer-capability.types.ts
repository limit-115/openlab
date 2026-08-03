import type { z } from "zod";
import type { AnswerCapabilitySchema } from "#src/capabilities/answer-capability.schema";

export type AnswerCapability = z.infer<typeof AnswerCapabilitySchema>;
