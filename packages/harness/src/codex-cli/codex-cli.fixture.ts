export const CodexTestNativeEventTypes = {
    THREAD_STARTED: "thread.started",
    ITEM_COMPLETED: "item.completed",
    TURN_COMPLETED: "turn.completed"
} as const;

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
