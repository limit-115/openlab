export const HarnessKinds = {
    CODEX: "codex",
    CLAUDE: "claude"
} as const;

export type HarnessKind = (typeof HarnessKinds)[keyof typeof HarnessKinds];

export const HarnessAuthenticationMethods = {
    CHATGPT: "chatgpt",
    CLAUDE_AI: "claude.ai"
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

export const HarnessTimeoutMilliseconds = {
    PREFLIGHT: 30_000,
    RUN: 3_600_000
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
