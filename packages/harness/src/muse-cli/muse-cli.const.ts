import {
    type HarnessEffortLevel,
    HarnessEffortLevels
} from "#src/agent-harness/agent-harness.const";

export const MUSE_BINARY = "muse";

/**
 * Where the credential Muse Code was signed in with has to point. Meta serves subscription-free
 * metered billing from this host, and `muse --base-url` will send a run anywhere else — a reseller's
 * mirror, a local proxy, another account's gateway — while the CLI still reports itself as Muse. The
 * harness never passes that flag, and it refuses a stored credential whose own base URL has moved,
 * because a run that went somewhere else was not billed to the account the manifest names.
 */
export const MUSE_BASE_URL = "https://api.meta.ai/v1";

/**
 * `muse` on the path is a launcher that replaces the binary underneath it whenever a new release is
 * out, including between a preflight reading the version and the run that version is recorded for.
 * The lab pins it off for the length of a run so the manifest names the binary that did the work;
 * updating is the operator's to do, in their own time, and `openlab` tells them when there is one.
 */
export const MUSE_NO_AUTO_UPDATE_VARIABLE = "MUSE_NO_AUTO_UPDATE";
export const MUSE_NO_AUTO_UPDATE_VALUE = "1";

/** The one provider the lab drives Muse Code through; `echo` is the CLI's offline test double. */
export const MuseProviders = {
    META: "meta"
} as const;

/**
 * The two tiers Muse Code sells, which are model ids rather than plans: there is no subscription to
 * pick, so the id on the command line is the whole billing decision. The contributor tier is roughly
 * an order of magnitude cheaper and buys that with the prompts and completions themselves — Meta
 * trains on them. A lab that reads private code and hunts unpublished vulnerabilities cannot opt into
 * that by inheriting a machine-local default, so the lab pins the standard tier and an operator who
 * wants the cheaper one has to name it on the run.
 */
export const MuseModels = {
    STANDARD: "muse-spark-1.2",
    CONTRIBUTOR: "muse-spark-1.2-contributor"
} as const;

/** Applied when a run request does not name its own model or effort. */
export const MuseSessionDefaults = {
    MODEL: MuseModels.STANDARD,
    EFFORT: HarnessEffortLevels.MEDIUM
} as const;

/**
 * Muse Code offers seven reasoning levels where the lab has five. The lab's five land on the five
 * that match them by name, and `max` becomes `ultra`, which is what Muse calls its top level. The two
 * Muse levels below `low` are unreachable on purpose: the lab has no setting that means them.
 */
export const MuseReasoningEfforts: Record<HarnessEffortLevel, string> = {
    [HarnessEffortLevels.LOW]: "low",
    [HarnessEffortLevels.MEDIUM]: "medium",
    [HarnessEffortLevels.HIGH]: "high",
    [HarnessEffortLevels.XHIGH]: "xhigh",
    [HarnessEffortLevels.MAX]: "ultra"
};

/**
 * The envelope every `muse exec --json` line carries. `stream.kind` says which of the three streams
 * a record belongs to, and the session stream's id is the id a run is known by afterwards.
 */
export const MuseStreamKinds = {
    SESSION: "session",
    RUN: "run",
    TASK: "task"
} as const;

/** The payload types the harness reads. Everything else is kept as a native event and not read. */
export const MusePayloadTypes = {
    RUN_MODEL_CONFIGURED: "run.model.configured",
    RUN_LIFECYCLE_STARTED: "run.lifecycle.started",
    RUN_OUTPUT_DELTA: "run.output.delta",
    RUN_TERMINAL_COMPLETED: "run.terminal.completed",
    RUN_TERMINAL_FAILED: "run.terminal.failed",
    TOOL_RESULT: "tool.result",
    TASK_LIFECYCLE_PROPOSED: "task.lifecycle.proposed",
    TASK_LIFECYCLE_FAILED: "task.lifecycle.failed"
} as const;

/**
 * A proposed task names what is about to happen as `<family>.<name>`. Only the tool family is a tool
 * call; the model's own turns and the CLI's reminder plugins share the same shape and are not.
 */
export const MuseTaskKindPrefixes = {
    TOOL: "tool."
} as const;

/** Stands in when a Muse record reports a tool result without naming the tool that produced it. */
export const MuseSyntheticToolNames = {
    RESULT: "muse_tool"
} as const;

/**
 * Where the CLI keeps the credential its login wrote. The harness reads it rather than asking the
 * CLI, because Muse Code has no command that reports who it is signed in as without opening a
 * terminal UI, and a preflight cannot answer a question by drawing a screen nobody is watching.
 */
export const MuseCredentialStore = {
    DIRECTORY_SEGMENTS: ["muse"],
    FILE_NAME: "auth.json",
    XDG_VARIABLE: "XDG_CONFIG_HOME",
    HOME_VARIABLE: "HOME",
    WINDOWS_HOME_VARIABLE: "USERPROFILE",
    HOME_SEGMENTS: [".config"]
} as const;

/**
 * How the operator proved who they are. `oauth` is the Meta-account login; anything else is a raw
 * API key pasted into the CLI, which bills whichever account issued it rather than the one the
 * operator signed in as, so the manifest states which of the two paid.
 */
export const MuseAuthMechanisms = {
    OAUTH: "oauth"
} as const;
