import { z } from "zod";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";

/**
 * What one investigation dispatches to, and whether the lab's spend caps hold it. Both are settled
 * when the investigation opens and both can be moved afterwards, because the moment they matter most
 * is the one where every subscription the investigation may use has been stopped: the operator
 * either points it at another harness or tells it to spend past the caps.
 *
 * The goal is not here. What an investigation is chasing is what it is; changing that is starting a
 * different investigation.
 */
export const InvestigationDispatchSchema = z.object({
    harness_kinds: z.array(z.enum(AgentHarnessKind)).nonempty(),
    spend_past_caps: z.boolean()
});
