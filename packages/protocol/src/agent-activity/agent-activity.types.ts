import type { z } from "zod";
import type {
    AgentActivitySchema,
    AgentRunIdentitySchema,
    AgentUsageSchema
} from "#src/agent-activity/agent-activity.schema";

export type AgentRunIdentity = z.infer<typeof AgentRunIdentitySchema>;
export type AgentUsage = z.infer<typeof AgentUsageSchema>;
export type AgentActivity = z.infer<typeof AgentActivitySchema>;
