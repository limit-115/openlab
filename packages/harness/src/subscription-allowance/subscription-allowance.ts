import { type HarnessKind, HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { readClaudeAllowance } from "#src/subscription-allowance/claude-allowance";
import { readCodexAllowance } from "#src/subscription-allowance/codex-allowance";
import { readDeepseekAllowance } from "#src/subscription-allowance/deepseek-allowance";
import { readGlmAllowance } from "#src/subscription-allowance/glm-allowance";
import { readMuseAllowance } from "#src/subscription-allowance/muse-allowance";
import type {
    ReadSubscriptionAllowance,
    SubscriptionAllowance
} from "#src/subscription-allowance/subscription-allowance.types";

const ALLOWANCE_READER: Record<HarnessKind, ReadSubscriptionAllowance> = {
    [HarnessKinds.CLAUDE]: readClaudeAllowance,
    [HarnessKinds.CODEX]: readCodexAllowance,
    [HarnessKinds.GLM]: readGlmAllowance,
    [HarnessKinds.DEEPSEEK]: readDeepseekAllowance,
    [HarnessKinds.MUSE]: readMuseAllowance
};

/**
 * Asks one vendor what is left of the subscription that harness runs on. Every vendor answers from
 * the login the operator already made, so a reading needs no credential of the lab's own and never
 * spends the allowance it is reporting on.
 */
export function readSubscriptionAllowance(
    kind: HarnessKind,
    signal?: AbortSignal
): Promise<SubscriptionAllowance> {
    return ALLOWANCE_READER[kind](signal);
}
