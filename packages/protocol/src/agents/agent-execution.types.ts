import type { z } from "zod";
import type { AgentExecutionSchema } from "#src/agents/agent-execution.schema";

export type AgentExecution = z.infer<typeof AgentExecutionSchema>;
