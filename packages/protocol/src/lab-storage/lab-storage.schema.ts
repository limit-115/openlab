import { z } from "zod";

/**
 * One run directory as it stands on disk. `goal` is null for a directory the lab holds no
 * investigation for any more: it is still taking up space, and a purge still removes it, so it is
 * reported rather than hidden behind the roster.
 */
export const RunDirectoryUsageSchema = z.object({
    investigation_id: z.string().min(1),
    goal: z.string().min(1).nullable(),
    path: z.string().min(1),
    bytes: z.number().int().nonnegative(),
    file_count: z.number().int().nonnegative()
});

/** What the lab is taking up, and where. */
export const LabStorageSchema = z.object({
    workspace_root: z.string().min(1),
    bytes: z.number().int().nonnegative(),
    runs: z.array(RunDirectoryUsageSchema)
});
