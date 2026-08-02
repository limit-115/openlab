export const StreamState = {
    CONNECTING: "connecting",
    LIVE: "live",
    RECONNECTING: "reconnecting",
    UNAVAILABLE: "unavailable"
} as const;
export type StreamState = (typeof StreamState)[keyof typeof StreamState];

export const StreamEventType = {
    EVENT: "event",
    SNAPSHOT: "snapshot",
    STATUS: "status",
    MESSAGE: "message"
} as const;
export type StreamEventType = (typeof StreamEventType)[keyof typeof StreamEventType];
