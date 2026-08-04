import type { z } from "zod";
import type {
    HarnessModelSchema,
    LabSettingsSchema,
    RoleExecutionSchema
} from "#src/lab-settings/lab-settings.schema";

export type HarnessModel = z.infer<typeof HarnessModelSchema>;
export type RoleExecution = z.infer<typeof RoleExecutionSchema>;
export type LabSettings = z.infer<typeof LabSettingsSchema>;
