const durationFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
});

export function formatDuration(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
        return `${durationFormatter.format(days)}d ${hours}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

export function formatDate(value?: string): string {
    return value ? dateFormatter.format(new Date(value)) : "—";
}

export function formatTime(value?: string): string {
    return value ? timeFormatter.format(new Date(value)) : "—";
}

export function formatIdentifier(value: string): string {
    return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

export function formatEventPayload(payload: Record<string, unknown>): string | undefined {
    const preferredKeys = ["summary", "message", "reason", "objective", "claim", "status"];

    for (const key of preferredKeys) {
        const value = payload[key];
        if (typeof value === "string" && value.trim()) {
            return value;
        }
    }

    const serialized = JSON.stringify(payload);
    return serialized === "{}" ? undefined : serialized;
}
