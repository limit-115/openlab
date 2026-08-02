import type { z } from "zod";
import type { AgentSummarySchema } from "#src/agents/agent-summary.schema";

export type AgentSummary = z.infer<typeof AgentSummarySchema>;
