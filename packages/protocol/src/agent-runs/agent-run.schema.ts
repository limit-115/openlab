import { z } from "zod";
import { AgentRunStatus } from "#src/agent-runs/agent-run-status.const";
import { AgentExecutionSchema } from "#src/agents/agent-execution.schema";
import { AgentRoleSchema } from "#src/agents/agent-role.schema";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";

export const AgentRunStatusSchema = z.enum(AgentRunStatus);

/**
 * One agent doing one piece of work. This is the whole of what used to be an agent, a task, an
 * attempt and an experiment: four records that were only ever four views of a single CLI session,
 * kept in sync with each other at the cost of saying nothing more than this does.
 */
export const AgentRunSchema = z.object({
    id: IdentifierSchema,
    role: AgentRoleSchema,
    /** Absent on a director run, which answers to the goal rather than to one lead. */
    lead_id: IdentifierSchema.optional(),
    objective: z.string().trim().min(1),
    status: AgentRunStatusSchema.default(AgentRunStatus.RUNNING),
    /** Absent until the harness has resolved which model and effort the session runs at. */
    execution: AgentExecutionSchema.optional(),
    cwd: z.string().trim().min(1),
    exit_code: z.int().nullable().optional(),
    error: z.string().trim().min(1).optional(),
    /**
     * The manifest of this session's run: what it executed as, how it ended, and every artifact it
     * left, each named with its digest. The transcripts themselves sit beside it in the same run
     * directory, including the lab's copy of what the CLI recorded for its own subagents.
     */
    manifest_path: z.string().trim().min(1).optional(),
    started_at: z.iso.datetime(),
    finished_at: z.iso.datetime().optional()
});
