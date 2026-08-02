import type { z } from "zod";
import type { InternalTaskSchema } from "#src/task-queue/internal-task.schema";

export type InternalTask = z.infer<typeof InternalTaskSchema>;
