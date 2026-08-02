import { z } from "zod";
import { AgentRoleSchema } from "#src/agents/agent-role.schema";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { InternalTaskStatus } from "#src/task-queue/internal-task-status.const";

export const InternalTaskStatusSchema = z.enum(InternalTaskStatus);

export const InternalTaskSchema = z.object({
    id: IdentifierSchema,
    branch_id: IdentifierSchema,
    objective: z.string().trim().min(1),
    context_refs: z.array(z.string()).default([]),
    status: InternalTaskStatusSchema.default(InternalTaskStatus.QUEUED),
    attempt: z.int().positive().default(1),
    role: AgentRoleSchema
});
