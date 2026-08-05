export const CapabilityResponseError = {
    EMPTY_ANSWER: "A capability answer must not be empty"
} as const;

export const StatusServerError = {
    UNKNOWN_INVESTIGATION: "No such investigation",
    INVALID_INPUT: "An investigation needs a goal",
    INVALID_SETTINGS: "The lab settings name a harness, a role or a model the lab cannot run",
    INVALID_DISPATCH: "An investigation needs at least one harness to dispatch to",
    UNCONFIGURED_CHANNEL: "The lab holds no credentials for that channel",
    NOT_FOUND: "Not found"
} as const;

/** Every address the lab answers on. The roster is the lab's; the rest belong to one investigation. */
export const LabRoute = {
    HEALTH: "/health",
    INVESTIGATIONS: "/api/investigations",
    ROSTER_EVENTS: "/api/events"
} as const;

export const InvestigationRoute = {
    ONE: "/api/investigations/:id",
    STATUS: "/api/investigations/:id/status",
    ASSUMPTIONS: "/api/investigations/:id/assumptions",
    CAPABILITIES: "/api/investigations/:id/capabilities",
    ANSWER_CAPABILITY: "/api/investigations/:id/capabilities/:capabilityId/answer",
    INSPECT: "/api/investigations/:id/inspect/:entityId",
    /** What this investigation dispatches to, and whether the lab's spend caps hold it. */
    DISPATCH: "/api/investigations/:id/dispatch",
    WAKE: "/api/investigations/:id/wake",
    PAUSE: "/api/investigations/:id/pause",
    STOP: "/api/investigations/:id/stop",
    EXPORT: "/api/investigations/:id/export",
    EVENTS: "/api/investigations/:id/events"
} as const;

/** Why the loop was given up, written where the operator reads the investigation's history. */
export const DISPATCH_CHANGED_REASON = "The operator changed what this investigation dispatches to";

/** Why an investigation is awake again, written where the operator reads its history. */
export const SPEND_CAPS_RAISED_REASON = "The operator raised the spend caps the lab is held to";

/** The named server-sent events one investigation's stream carries. */
export const StreamEvent = {
    SNAPSHOT: "snapshot",
    EVENT: "event",
    STATUS: "status"
} as const;

/** The lab's own stream carries the roster, and nothing else: one line per investigation. */
export const RosterStreamEvent = {
    ROSTER: "roster"
} as const;

export const STREAM_HEARTBEAT_MS = 15_000;

export const STREAM_HEADERS = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
} as const;
