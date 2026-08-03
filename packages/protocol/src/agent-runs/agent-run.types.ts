import type { z } from "zod";
import type { AgentRunSchema } from "#src/agent-runs/agent-run.schema";

export type AgentRun = z.infer<typeof AgentRunSchema>;
