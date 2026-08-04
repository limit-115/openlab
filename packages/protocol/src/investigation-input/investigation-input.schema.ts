import { z } from "zod";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { DEFAULT_HARNESS_KINDS } from "#src/investigation-input/investigation-input.const";

export const InvestigationInputSchema = z.object({
    goal: z.string().trim().min(1),
    context: z.array(z.string()).default([]),
    success_criteria: z.array(z.string()).default([]),
    /** The harnesses this investigation may dispatch to, rotated in the order they are given. */
    harness_kinds: z
        .array(z.enum(AgentHarnessKind))
        .nonempty()
        .default([...DEFAULT_HARNESS_KINDS])
});
