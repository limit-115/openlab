import { z } from "zod";
import {
    AgentRunIdentitySchema,
    AgentUsageSchema
} from "#src/agent-activity/agent-activity.schema";
import {
    AgentActivityFrameKind,
    AgentDiagnosticLevel,
    AgentToolPhase
} from "#src/agent-activity/agent-activity-frame.const";
import { AgentRunStatus } from "#src/agent-runs/agent-run-status.const";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";

const FrameBaseSchema = z.object({
    run_id: IdentifierSchema,
    /**
     * The harness event's own position within its run. Live frames and frames replayed from the
     * run's events.jsonl share this numbering, which is what lets the two sources be merged.
     */
    sequence: z.number().int().positive(),
    occurred_at: z.iso.datetime()
});

const RunStartedFrameSchema = FrameBaseSchema.extend({
    kind: z.literal(AgentActivityFrameKind.RUN_STARTED),
    ...AgentRunIdentitySchema.shape,
    session_id: z.string().min(1).nullable()
});

/**
 * Text the agent produced during one turn. An unsealed frame appends a chunk as the model writes
 * it; the sealed frame carries the turn's complete text and replaces whatever the chunks built up.
 * Replayed history therefore needs sealed frames only.
 */
const AgentTextFrameSchema = FrameBaseSchema.extend({
    kind: z.enum([AgentActivityFrameKind.THINKING, AgentActivityFrameKind.MESSAGE]),
    turn: z.number().int().nonnegative(),
    text: z.string(),
    sealed: z.boolean()
});

const ToolFrameSchema = FrameBaseSchema.extend({
    kind: z.literal(AgentActivityFrameKind.TOOL),
    tool_name: z.string().min(1),
    call_id: z.string().min(1).nullable(),
    phase: z.enum(AgentToolPhase),
    /** The command, path or argument the call is about, shown whole or not at all. */
    detail: z.string().min(1).nullable()
});

const DiagnosticFrameSchema = FrameBaseSchema.extend({
    kind: z.literal(AgentActivityFrameKind.DIAGNOSTIC),
    level: z.enum(AgentDiagnosticLevel),
    message: z.string().min(1)
});

const UsageFrameSchema = FrameBaseSchema.extend({
    kind: z.literal(AgentActivityFrameKind.USAGE),
    usage: AgentUsageSchema
});

const RunFinishedFrameSchema = FrameBaseSchema.extend({
    kind: z.literal(AgentActivityFrameKind.RUN_FINISHED),
    status: z.enum(AgentRunStatus),
    error: z.string().min(1).nullable()
});

export const AgentActivityFrameSchema = z.discriminatedUnion("kind", [
    RunStartedFrameSchema,
    AgentTextFrameSchema,
    ToolFrameSchema,
    DiagnosticFrameSchema,
    UsageFrameSchema,
    RunFinishedFrameSchema
]);
