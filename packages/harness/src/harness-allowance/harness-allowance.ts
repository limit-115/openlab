import { type HarnessKind, HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { readClaudeAllowance } from "#src/harness-allowance/claude-allowance";
import { readCodexAllowance } from "#src/harness-allowance/codex-allowance";
import { readDeepseekAllowance } from "#src/harness-allowance/deepseek-allowance";
import { readGlmAllowance } from "#src/harness-allowance/glm-allowance";
import type {
    HarnessAllowanceReading,
    ReadHarnessAllowance
} from "#src/harness-allowance/harness-allowance.types";
import { readMuseAllowance } from "#src/harness-allowance/muse-allowance";

const ALLOWANCE_READER: Record<HarnessKind, ReadHarnessAllowance> = {
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
export function readHarnessAllowance(
    kind: HarnessKind,
    signal?: AbortSignal
): Promise<HarnessAllowanceReading> {
    return ALLOWANCE_READER[kind](signal);
}
