/**
 * How a harness is paid for. It is a named set rather than a boolean because the two are not
 * opposites an operator can infer one from the other: a plan already bought costs the same whether
 * the lab works for ten minutes or all night, and a wallet billed by the token does not.
 */
export const HARNESS_BILLING = {
    SUBSCRIPTION: "subscription",
    USAGE: "usage"
} as const;

export type HarnessBilling = (typeof HARNESS_BILLING)[keyof typeof HARNESS_BILLING];

/**
 * What each kind of billing is called on the page. The usage line is blunt on purpose: an operator
 * hands over a key for exactly one of these four, and they should read that before they do, not
 * after the first invoice.
 */
export const HARNESS_BILLING_LABEL = {
    [HARNESS_BILLING.SUBSCRIPTION]: "Plan you already hold",
    [HARNESS_BILLING.USAGE]: "Your wallet, by the token"
} as const satisfies Record<HarnessBilling, string>;

/**
 * Every harness the lab dispatches agents to, each named the way its vendor names it. Two of them
 * are driven through another vendor's CLI, and saying which keeps an operator from reading them as
 * a second subscription to that vendor. The `command` is the executable `openlab doctor` looks for,
 * so it is the literal name on `PATH` and never a prettier spelling of it.
 */
export const HARNESS = [
    {
        name: "Codex",
        command: "codex",
        billing: HARNESS_BILLING.SUBSCRIPTION,
        note: "The Codex CLI, on the subscription it is already signed in to."
    },
    {
        name: "Claude",
        command: "claude",
        billing: HARNESS_BILLING.SUBSCRIPTION,
        note: "The Claude Code CLI, on the subscription it is already signed in to."
    },
    {
        name: "GLM",
        command: "glm",
        billing: HARNESS_BILLING.SUBSCRIPTION,
        note: "A Z.ai coding plan, served over an Anthropic-compatible API and driven through the Claude CLI."
    },
    {
        name: "DeepSeek",
        command: "deepseek",
        billing: HARNESS_BILLING.USAGE,
        note: "A key you hand over, driven through the Codex CLI. Nothing caps it, and its setup card says so first."
    },
    {
        name: "Muse Code",
        command: "muse",
        billing: HARNESS_BILLING.USAGE,
        note: "A Meta account, metered the same way and publishing no balance at all, so the lab cannot say what a run cost until Meta does."
    }
] as const;

/**
 * How many times the roster is written into one half of the moving strip. Four keeps the line full
 * on a wide screen; the track holds two of these halves and travels exactly one of them, so the
 * seam lands where a copy ended and there is nothing to see at the wrap.
 */
export const HARNESS_STRIP_REPEATS = 4;
