import { z } from "zod";
import { AgentEffortLevel, AgentHarnessKind } from "#src/agents/agent-execution.const";

/**
 * How an agent's work is actually being run. Every field is resolved by the harness before the run
 * starts, so an operator never has to guess which model or effort produced a result.
 */
export const AgentExecutionSchema = z.object({
    harness: z.enum(AgentHarnessKind),
    model: z.string().trim().min(1),
    effort: z.enum(AgentEffortLevel)
});
