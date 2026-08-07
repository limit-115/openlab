import type { z } from "zod";
import type {
    DeepseekKeySchema,
    DeepseekKeyStateSchema
} from "#src/deepseek-key/deepseek-key.schema";

export type DeepseekKey = z.infer<typeof DeepseekKeySchema>;
export type DeepseekKeyState = z.infer<typeof DeepseekKeyStateSchema>;
