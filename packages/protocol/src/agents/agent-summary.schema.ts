import { z } from "zod";
import { AgentExecutionSchema } from "#src/agents/agent-execution.schema";
import { AgentRoleSchema } from "#src/agents/agent-role.schema";
import { AgentStatus } from "#src/agents/agent-status.const";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";

export const AgentSummarySchema = z.object({
    id: IdentifierSchema,
    branch_id: IdentifierSchema,
    role: AgentRoleSchema,
    status: z.enum(AgentStatus),
    current_task_id: IdentifierSchema.optional(),
    /** Absent only until the agent's first harness run starts. */
    execution: AgentExecutionSchema.optional()
});
