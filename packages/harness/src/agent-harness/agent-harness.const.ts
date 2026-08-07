export const HarnessKinds = {
    CODEX: "codex",
    CLAUDE: "claude",
    GLM: "glm",
    DEEPSEEK: "deepseek"
} as const;

export type HarnessKind = (typeof HarnessKinds)[keyof typeof HarnessKinds];

/**
 * What a harness proved before it was allowed to run. Three of these name a subscription the vendor
 * bills by the month; `DEEPSEEK_API_KEY` names a wallet the vendor bills by the token, and it is
 * spelled differently precisely so a run manifest never reads as a subscription run.
 */
export const HarnessAuthenticationMethods = {
    CHATGPT: "chatgpt",
    CLAUDE_AI: "claude.ai",
    ZAI_CODING_PLAN: "zai-coding-plan",
    DEEPSEEK_API_KEY: "deepseek-api-key"
} as const;

export type HarnessAuthenticationMethod =
    (typeof HarnessAuthenticationMethods)[keyof typeof HarnessAuthenticationMethods];

export const HarnessRunStatuses = {
    RUNNING: "running",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    TIMED_OUT: "timed_out",
    CANCELLED: "cancelled"
} as const;

export type HarnessRunStatus = Exclude<
    (typeof HarnessRunStatuses)[keyof typeof HarnessRunStatuses],
    typeof HarnessRunStatuses.RUNNING
>;

/**
 * The run watchdog is there for a CLI that has stopped talking, not for one that is taking its time:
 * a research agent that reads, builds and rechecks its own claims works for hours, and the clock
 * counts every hour the machine spends asleep as well. Six hours is long enough that only a hung
 * process reaches it.
 */
export const HarnessTimeoutMilliseconds = {
    PREFLIGHT: 30_000,
    RUN: 21_600_000
} as const;

export const HarnessInputSources = {
    PROMPT: "prompt"
} as const;

export type HarnessInputSource = (typeof HarnessInputSources)[keyof typeof HarnessInputSources];

export const HarnessEffortLevels = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    XHIGH: "xhigh",
    MAX: "max"
} as const;

export type HarnessEffortLevel = (typeof HarnessEffortLevels)[keyof typeof HarnessEffortLevels];

export const HarnessExecutionProfiles = {
    UNRESTRICTED: "unrestricted",
    READ_ONLY: "read_only"
} as const;

export type HarnessExecutionProfile =
    (typeof HarnessExecutionProfiles)[keyof typeof HarnessExecutionProfiles];
