import { localeFormatter } from "#src/value-display/locale-formatter";

/**
 * Timestamps follow the language the interface is in for date order and month name, but the clock
 * is always 24-hour: a research log is read against wall-clock time, and an am/pm suffix costs a
 * glance to decode.
 */
const HOUR_CYCLE = "h23" as const;

const dateFormatter = localeFormatter(
    (locale) =>
        new Intl.DateTimeFormat(locale, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: HOUR_CYCLE
        })
);
const timeFormatter = localeFormatter(
    (locale) =>
        new Intl.DateTimeFormat(locale, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: HOUR_CYCLE
        })
);

export function formatDate(value?: string): string {
    return value ? dateFormatter().format(new Date(value)) : "—";
}

export function formatTime(value?: string): string {
    return value ? timeFormatter().format(new Date(value)) : "—";
}
