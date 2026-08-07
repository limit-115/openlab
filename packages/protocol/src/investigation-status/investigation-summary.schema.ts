import { z } from "zod";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { InvestigationStateSchema } from "#src/investigation-lifecycle/investigation-state.schema";

/**
 * One line of the lab's roster of investigations. It carries what an operator needs to choose
 * between them without opening any: what it is chasing, where its lifecycle stands, and how much
 * ground it has covered.
 */
export const InvestigationSummarySchema = z.object({
    id: IdentifierSchema,
    goal: z.string().min(1),
    state: InvestigationStateSchema,
    reason: z.string().optional(),
    started_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
    uptime_ms: z.number().nonnegative(),
    harness_kinds: z.array(z.enum(AgentHarnessKind)).nonempty(),
    lead_count: z.number().int().nonnegative(),
    finding_count: z.number().int().nonnegative(),
    confirmed_finding_count: z.number().int().nonnegative(),
    open_capability_count: z.number().int().nonnegative(),
    active_run_count: z.number().int().nonnegative()
});
