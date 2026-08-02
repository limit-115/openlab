import type { z } from "zod";
import type { AgentActivityFrameSchema } from "#src/agent-activity/agent-activity-frame.schema";

export type AgentActivityFrame = z.infer<typeof AgentActivityFrameSchema>;
