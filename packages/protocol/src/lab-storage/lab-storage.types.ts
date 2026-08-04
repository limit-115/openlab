import type { z } from "zod";
import type {
    LabStorageSchema,
    RunDirectoryUsageSchema
} from "#src/lab-storage/lab-storage.schema";

export type RunDirectoryUsage = z.infer<typeof RunDirectoryUsageSchema>;
export type LabStorage = z.infer<typeof LabStorageSchema>;
