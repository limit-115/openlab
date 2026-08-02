export const CODEX_BINARY = "codex";

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
