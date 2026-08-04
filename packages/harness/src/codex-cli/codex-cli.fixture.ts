export const CodexTestNativeEventTypes = {
    THREAD_STARTED: "thread.started",
    ITEM_COMPLETED: "item.completed",
    TURN_COMPLETED: "turn.completed",
    TURN_FAILED: "turn.failed",
    ERROR: "error"
} as const;

/** Verbatim, as Codex emitted it on the run that hibernated the investigation for the wrong reason. */
export const CodexTestUsageLimitMessage =
    "You've hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at Aug 9th, 2026 6:50 PM.";

export const CodexTestItemTypes = {
    AGENT_MESSAGE: "agent_message"
} as const;

export const CodexTestLoginMarkers = {
    CHATGPT: "Logged in using ChatGPT",
    API_KEY: "Logged in using an API key"
} as const;

export const CodexTestCliValues = {
    VERSION: "codex-cli 0.146.0",
    COLOR_NEVER: "never"
} as const;
