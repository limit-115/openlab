/**
 * Timestamps follow the operator's locale for date order, but the clock is always 24-hour: a
 * research log is read against wall-clock time, and an am/pm suffix costs a glance to decode.
 */
const HOUR_CYCLE = "h23" as const;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: HOUR_CYCLE
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: HOUR_CYCLE
});

export function formatDate(value?: string): string {
    return value ? dateFormatter.format(new Date(value)) : "—";
}

export function formatTime(value?: string): string {
    return value ? timeFormatter.format(new Date(value)) : "—";
}
