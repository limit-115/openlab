import { AgentHarnessKind } from "#src/agents/agent-execution.const";

/**
 * What pays for a harness's runs. A subscription is bought before the lab starts and spent by the
 * hour; a wallet is spent by the token, and the bill arrives after the work rather than before it.
 * The difference decides what an operator has to be told before they hand a harness a lead, so it
 * is a fact about the harness rather than a note somewhere on a page.
 */
export const AgentHarnessBilling = {
    SUBSCRIPTION: "subscription",
    USAGE: "usage"
} as const;
export type AgentHarnessBilling = (typeof AgentHarnessBilling)[keyof typeof AgentHarnessBilling];

/**
 * How each harness is paid for. Three of them draw on a plan the operator already bought, so a long
 * night of research costs what the plan cost. DeepSeek and Muse Code bill per token, and an
 * investigation left running spends real money for as long as it runs. DeepSeek at least states a
 * balance the lab can show; Muse Code states nothing at all, so an operator running it overnight
 * finds out what it cost from Meta afterwards.
 */
export const HARNESS_BILLING: Record<AgentHarnessKind, AgentHarnessBilling> = {
    [AgentHarnessKind.CODEX]: AgentHarnessBilling.SUBSCRIPTION,
    [AgentHarnessKind.CLAUDE]: AgentHarnessBilling.SUBSCRIPTION,
    [AgentHarnessKind.GLM]: AgentHarnessBilling.SUBSCRIPTION,
    [AgentHarnessKind.DEEPSEEK]: AgentHarnessBilling.USAGE,
    [AgentHarnessKind.MUSE]: AgentHarnessBilling.USAGE
};
