import { z } from "zod";

export const FrontierSnapshotSchema = z.object({
    known: z.array(z.string()).default([]),
    open_questions: z.array(z.string()).default([]),
    blockers: z.array(z.string()).default([]),
    next_experiments: z.array(z.string()).default([]),
    updated_at: z.iso.datetime()
});
