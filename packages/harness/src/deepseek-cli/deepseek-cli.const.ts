import {
    type HarnessEffortLevel,
    HarnessEffortLevels
} from "#src/agent-harness/agent-harness.const";

/** DeepSeek runs on the Codex CLI: DeepSeek serves its models over the OpenAI Responses API. */
export const DEEPSEEK_BINARY = "codex";

/**
 * Pinned, never configurable. Everything else DeepSeek serves — the chat-completions endpoint, a
 * reseller's mirror, a local proxy — bills a different wallet or none at all, and a lab that let the
 * host move could not say afterwards whose money paid for a run.
 */
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com/";

/** States whether the wallet behind a key can still pay, which is what a preflight has to know. */
export const DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";

/**
 * The credential reaches the CLI through the environment and never through an argument. Codex will
 * take a bearer token as a config override, but every argument is written into the run manifest and
 * is readable in the process table, so the key would outlive the run in both places.
 */
export const DEEPSEEK_API_KEY_VARIABLE = "DEEPSEEK_API_KEY";

/** The provider Codex is told to talk to, named the same way in every override that configures it. */
export const DeepseekProvider = {
    ID: "deepseek",
    NAME: "DeepSeek",
    WIRE_API: "responses"
} as const;

/** Applied when a run request does not name its own model or effort. */
export const DeepseekSessionDefaults = {
    MODEL: "deepseek-v4-flash",
    EFFORT: HarnessEffortLevels.MEDIUM
} as const;

/**
 * DeepSeek exposes three reasoning levels where the lab has five, so the lab's are folded onto them
 * rather than passed through and silently dropped. `high` is DeepSeek's middle level and the one its
 * own Codex configuration ships, which is where the lab's middle setting belongs.
 */
export const DeepseekReasoningEfforts: Record<HarnessEffortLevel, string> = {
    [HarnessEffortLevels.LOW]: "low",
    [HarnessEffortLevels.MEDIUM]: "high",
    [HarnessEffortLevels.HIGH]: "high",
    [HarnessEffortLevels.XHIGH]: "max",
    [HarnessEffortLevels.MAX]: "max"
};

/**
 * Where the key the operator typed is kept: the program's own home, beside the install receipt, and
 * not in the lab's data directory. It is a credential rather than data — it outlives any one lab,
 * it must not travel with an export, and every agent CLI on the machine keeps its own the same way.
 * The modes are the ones a credential file gets: nobody else on the machine reads it.
 */
export const DeepseekCredentialStore = {
    DIRECTORY_SEGMENTS: [".openlab"],
    FILE_NAME: "deepseek.json",
    DIRECTORY_MODE: 0o700,
    FILE_MODE: 0o600
} as const;
