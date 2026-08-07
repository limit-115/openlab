import { HarnessEffortLevels } from "#src/agent-harness/agent-harness.const";

export const CODEX_BINARY = "codex";

/** Applied when a run request does not name its own model or effort. */
export const CodexSessionDefaults = {
    MODEL: "gpt-5.6-sol",
    EFFORT: HarnessEffortLevels.MEDIUM
} as const;

/**
 * Where the Codex CLI writes its own account of a session. `CODEX_HOME` moves the whole home and the
 * lab reads it from the environment it spawned the run with, so the two can never disagree. One
 * rollout file holds the thread, filed under the day the CLI opened it.
 */
export const CodexSessionStore = {
    HOME_VARIABLE: "CODEX_HOME",
    HOME_SEGMENTS: [".codex"],
    SESSIONS_DIRECTORY: "sessions",
    ROLLOUT_PREFIX: "rollout-",
    ROLLOUT_SUFFIX: ".jsonl"
} as const;

/** Codex takes everything but the model itself as a config override rather than as a flag. */
export const CodexConfigKeys = {
    MODEL_REASONING_EFFORT: "model_reasoning_effort",
    MODEL_PROVIDER: "model_provider",
    MODEL_PROVIDERS: "model_providers"
} as const;

/** What one entry under `model_providers` states about the endpoint a run is served from. */
export const CodexProviderFields = {
    NAME: "name",
    BASE_URL: "base_url",
    WIRE_API: "wire_api",
    ENV_KEY: "env_key"
} as const;

export const CodexPermissionModes = {
    UNRESTRICTED: "unrestricted",
    READ_ONLY: "read-only"
} as const;

export const CodexPermissionArguments = {
    [CodexPermissionModes.UNRESTRICTED]: ["--dangerously-bypass-approvals-and-sandbox"],
    [CodexPermissionModes.READ_ONLY]: ["--sandbox", CodexPermissionModes.READ_ONLY]
} as const;

export const CodexNativeEventTypes = {
    THREAD_STARTED: "thread.started",
    TURN_STARTED: "turn.started",
    TURN_COMPLETED: "turn.completed",
    TURN_FAILED: "turn.failed",
    ITEM_STARTED: "item.started",
    ITEM_UPDATED: "item.updated",
    ITEM_COMPLETED: "item.completed",
    ERROR: "error"
} as const;

export const CodexItemTypes = {
    AGENT_MESSAGE: "agent_message",
    REASONING: "reasoning"
} as const;

export const CodexLoginMarkers = {
    CHATGPT: "Logged in using ChatGPT"
} as const;

export const CodexSyntheticToolNames = {
    ITEM: "codex_item"
} as const;

export const CodexColorModes = {
    NEVER: "never"
} as const;
