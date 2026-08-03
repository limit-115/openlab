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

/**
 * An event type is a dotted key, and reads on the page as the sentence it describes. Only its first
 * letter is raised: a text transform would title-case every word and make "Harness Run Timed Out".
 */
export function humanizeEventType(type: string): string {
    const words = type.replaceAll(/[._-]+/g, " ");

    return words.charAt(0).toUpperCase() + words.slice(1);
}
