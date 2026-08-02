import { HarnessEffortLevels } from "#src/agent-harness/agent-harness.const";

/** GLM runs on the Claude CLI: Z.ai serves the coding plan over an Anthropic-compatible API. */
export const GLM_BINARY = "claude";

/**
 * Pinned, never configurable. A coding-plan credential also authenticates against Z.ai's generic
 * endpoint, where calls bill the prepaid wallet per token instead of drawing on the subscription
 * quota. Only this host and path stay inside the plan.
 */
export const ZAI_CODING_PLAN_BASE_URL = "https://api.z.ai/api/anthropic";

/** States the coding-plan tier and what is left of its quota. Absent for a wallet-billed key. */
export const ZAI_CODING_PLAN_QUOTA_URL = "https://api.z.ai/api/monitor/usage/quota/limit";

/** Applied when a run request does not name its own model or effort. */
export const GlmSessionDefaults = {
    MODEL: "glm-5.2",
    EFFORT: HarnessEffortLevels.MEDIUM
} as const;

/** Where the ZCode desktop login keeps the credential its Z.ai sign-in provisioned. */
export const ZCodeLoginStore = {
    CONFIG_SEGMENTS: [".zcode", "v2", "config.json"],
    CODING_PLAN_PROVIDER: "builtin:zai-coding-plan"
} as const;

/**
 * What `claude auth status --json` reports once an injected token supplies the credential. Anything
 * else means the CLI fell back to its own claude.ai login and would bill the wrong subscription.
 */
export const ClaudeReportedAuthMethods = {
    TOKEN: "oauth_token"
} as const;
