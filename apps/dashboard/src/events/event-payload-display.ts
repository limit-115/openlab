const PREFERRED_KEYS = ["summary", "message", "reason", "objective", "claim", "status"];

export function formatEventPayload(payload: Record<string, unknown>): string | undefined {
    for (const key of PREFERRED_KEYS) {
        const value = payload[key];
        if (typeof value === "string" && value.trim()) {
            return value;
        }
    }

    const serialized = JSON.stringify(payload);
    return serialized === "{}" ? undefined : serialized;
}

export function humanizeEventType(type: string): string {
    return type.replaceAll(/[._-]+/g, " ");
}
