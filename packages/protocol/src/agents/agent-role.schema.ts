import { z } from "zod";
import { AgentRole } from "#src/agents/agent-role.const";

export const AgentRoleSchema = z.enum(AgentRole);
