/**
 * Pinned exactly like every endpoint a harness talks to. This path answers for the OAuth login the
 * Claude CLI provisioned, which is the subscription the lab runs on.
 */
export const CLAUDE_OAUTH_USAGE_URL = "https://api.anthropic.com/api/oauth/usage";

/** The OAuth contract the Claude CLI announces; the usage endpoint answers only under it. */
export const CLAUDE_OAUTH_BETA = "oauth-2025-04-20";

/** Where the Claude CLI keeps the subscription login its interactive sign-in provisioned. */
export const ClaudeCredentialStore = {
    KEYCHAIN_BINARY: "security",
    KEYCHAIN_SERVICE: "Claude Code-credentials"
} as const;

/**
 * Codex states its remaining allowance over the app-server JSON-RPC channel rather than in a
 * command. The server shuts down as soon as stdin closes, so a caller has to hold the pipe open
 * until the answer arrives.
 */
export const CodexAppServer = {
    COMMAND: "app-server",
    INITIALIZE: "initialize",
    INITIALIZED: "initialized",
    RATE_LIMITS: "account/rateLimits/read",
    PROTOCOL_VERSION: "2.0",
    CLIENT_NAME: "lab-subscription-allowance"
} as const;

/** How long each Claude usage window runs, which the endpoint states only by field name. */
export const ClaudeWindowMinutes = {
    FIVE_HOUR: 300,
    SEVEN_DAY: 10_080
} as const;

/**
 * Z.ai states a window as a period unit and a count of them: unit 3 number 5 is the five-hour
 * window, unit 6 number 1 the weekly one. An unrecognised unit is dropped rather than guessed, so a
 * new period never reaches an operator mislabelled.
 */
export const ZaiPeriodMinutes: Readonly<Record<number, number>> = {
    3: 60,
    5: 43_200,
    6: 10_080
};

/**
 * The Z.ai limits that meter what a run spends. A TIME_LIMIT meters MCP tool usage instead, which
 * no lab run draws on, so carrying it would park a harness that still has its tokens.
 */
export const ZaiSpendingLimitType = {
    CREDIT: "CREDIT_LIMIT",
    TOKENS: "TOKENS_LIMIT"
} as const;
export type ZaiSpendingLimitType = (typeof ZaiSpendingLimitType)[keyof typeof ZaiSpendingLimitType];

/** A reading is monitoring, not work: it may never outlast the preflight it rides alongside. */
export const ALLOWANCE_TIMEOUT_MILLISECONDS = 15_000;
