import { HarnessEffortLevels } from "#src/agent-harness/agent-harness.const";

export const CLAUDE_BINARY = "claude";

/** Applied when a run request does not name its own model or effort. */
export const ClaudeSessionDefaults = {
    MODEL: "haiku",
    EFFORT: HarnessEffortLevels.MEDIUM
} as const;

export const ClaudePermissionModes = {
    BYPASS_PERMISSIONS: "bypassPermissions",
    PLAN: "plan"
} as const;

export const ClaudeApiProviders = {
    FIRST_PARTY: "firstParty"
} as const;

export const ClaudeOutputFormats = {
    STREAM_JSON: "stream-json"
} as const;

export const ClaudeSyntheticToolNames = {
    TOOL: "claude_tool",
    RESULT: "tool_result"
} as const;

export const ClaudeNativeEventTypes = {
    SYSTEM: "system",
    ASSISTANT: "assistant",
    USER: "user",
    STREAM_EVENT: "stream_event",
    RESULT: "result"
} as const;

export const ClaudeSystemSubtypes = {
    INIT: "init"
} as const;

export const ClaudeStreamEventTypes = {
    CONTENT_BLOCK_DELTA: "content_block_delta"
} as const;

export const ClaudeContentBlockTypes = {
    TEXT: "text",
    THINKING: "thinking",
    TOOL_USE: "tool_use",
    TOOL_RESULT: "tool_result"
} as const;

export const ClaudeDeltaTypes = {
    TEXT: "text_delta",
    THINKING: "thinking_delta",
    INPUT_JSON: "input_json_delta"
} as const;
