export const AGENT_ACTIVITY_ROUTE = "/api/investigations/:id/agents/activity" as const;

/** Keeps an idle stream from being closed by a proxy or an impatient client. */
export const ACTIVITY_HEARTBEAT_MS = 15_000;

export const ACTIVITY_STREAM_HEADERS = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
} as const;
