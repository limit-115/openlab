import { z } from "zod";
import { AgentActivityPhase } from "#src/agent-activity/agent-activity.const";
import { AgentRunStatus } from "#src/agent-runs/agent-run-status.const";
import { AgentExecutionSchema } from "#src/agents/agent-execution.schema";
import { AgentRoleSchema } from "#src/agents/agent-role.schema";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";

/**
 * Everything needed to title an agent's card. Carried both by the roster and by the frame that
 * opens a run, so a viewer joining mid-stream can render a newly started agent without refetching.
 */
export const AgentRunIdentitySchema = z.object({
    run_id: IdentifierSchema,
    /** Absent on a director run, which answers to the goal rather than to one bet. */
    assumption_id: IdentifierSchema.optional(),
    role: AgentRoleSchema,
    execution: AgentExecutionSchema,
    /** The full transcript this stream summarizes, for an operator who wants the raw record. */
    artifact_directory: z.string().min(1),
    started_at: z.iso.datetime()
});

export const AgentUsageSchema = z.object({
    input_tokens: z.number().int().nonnegative().nullable(),
    output_tokens: z.number().int().nonnegative().nullable(),
    cached_input_tokens: z.number().int().nonnegative().nullable()
});

/**
 * The live header of one agent's run. Its transcript is not carried here: frames deliver that, and
 * the run's own events.jsonl keeps the durable copy.
 */
export const AgentActivitySchema = AgentRunIdentitySchema.extend({
    session_id: z.string().min(1).nullable(),
    phase: z.enum(AgentActivityPhase),
    status: z.enum(AgentRunStatus),
    usage: AgentUsageSchema.nullable(),
    error: z.string().min(1).nullable(),
    updated_at: z.iso.datetime()
});

export const AgentActivityRosterSchema = z.array(AgentActivitySchema);
