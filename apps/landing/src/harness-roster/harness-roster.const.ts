import { AgentHarnessBilling } from "@openlab/protocol/agents/agent-billing.const";
import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";

/**
 * What each kind of billing is called on the page. The usage line is blunt on purpose: an operator
 * hands over a key for exactly one of these, and they should read that before they do, not after the
 * first invoice.
 */
export const HARNESS_BILLING_LABEL = {
    [AgentHarnessBilling.SUBSCRIPTION]: "Plan you already hold",
    [AgentHarnessBilling.USAGE]: "Your wallet, by the token"
} as const satisfies Record<AgentHarnessBilling, string>;

/**
 * Every harness the lab dispatches agents to, each named the way its vendor names it. Two of them
 * are driven through another vendor's CLI, and saying which keeps an operator from reading them as
 * a second subscription to that vendor. The `command` is the executable `openlab doctor` looks for,
 * so it is the literal name on `PATH` and never a prettier spelling of it.
 *
 * An entry names the harness it stands for rather than restating how that harness is paid for. The
 * lab already holds one billing table, and this is the page an operator decides what to install
 * from: a site that disagreed with the runtime about which harness spends money would be the worst
 * place in the product to be wrong.
 */
export const HARNESS = [
    {
        name: "Codex",
        command: "codex",
        kind: AgentHarnessKind.CODEX,
        note: "The Codex CLI, on the subscription it is already signed in to."
    },
    {
        name: "Claude",
        command: "claude",
        kind: AgentHarnessKind.CLAUDE,
        note: "The Claude Code CLI, on the subscription it is already signed in to."
    },
    {
        name: "GLM",
        command: "glm",
        kind: AgentHarnessKind.GLM,
        note: "A Z.ai coding plan, served over an Anthropic-compatible API and driven through the Claude CLI."
    },
    {
        name: "DeepSeek",
        command: "deepseek",
        kind: AgentHarnessKind.DEEPSEEK,
        note: "A key you hand over, driven through the Codex CLI. Nothing caps it, and its setup card says so first."
    },
    {
        name: "Muse Code",
        command: "muse",
        kind: AgentHarnessKind.MUSE,
        note: "A Meta account, metered the same way and publishing no balance at all, so the lab cannot say what a run cost until Meta does."
    }
] as const satisfies readonly {
    readonly name: string;
    readonly command: string;
    readonly kind: AgentHarnessKind;
    readonly note: string;
}[];

/**
 * How many times the roster is written into one half of the moving strip. Four keeps the line full
 * on a wide screen; the track holds two of these halves and travels exactly one of them, so the
 * seam lands where a copy ended and there is nothing to see at the wrap.
 */
export const HARNESS_STRIP_REPEATS = 4;
