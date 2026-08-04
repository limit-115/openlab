import type { z } from "zod";
import type { TaskInputSchema } from "#src/research-task/task-input.schema";

export type TaskInput = z.infer<typeof TaskInputSchema>;
