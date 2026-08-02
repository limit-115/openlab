import type { EventPayloadDisplay } from "#src/events/event-payload-display.types";

const PREFERRED_KEYS = ["summary", "message", "reason", "objective", "claim", "status"];

export function formatEventPayload(payload: Record<string, unknown>): EventPayloadDisplay {
    const headline = PREFERRED_KEYS.map((key) => payload[key]).find(
        (value): value is string => typeof value === "string" && value.trim().length > 0
    );

    const detail = Object.keys(payload).length > 0 ? JSON.stringify(payload, null, 4) : undefined;

    return {
        ...(headline === undefined ? {} : { headline }),
        ...(detail === undefined ? {} : { detail })
    };
}

export function humanizeEventType(type: string): string {
    return type.replaceAll(/[._-]+/g, " ");
}
