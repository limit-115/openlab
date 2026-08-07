const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;

/**
 * Names a window in the unit a vendor bills it in. A rolling day is called twenty-four hours rather
 * than one day, because it is the clock that resets and not the calendar. The unit and the number
 * are decided here; how many of something reads in a language is left to the catalogue.
 */
export type AllowanceWindowName =
    | { key: "windowDay" }
    | { key: "windowDays" | "windowHours" | "windowMinutes"; count: number };

export function allowanceWindowName(durationMinutes: number): AllowanceWindowName {
    const days = durationMinutes / MINUTES_PER_DAY;
    if (Number.isInteger(days)) {
        return days === 1 ? { key: "windowDay" } : { key: "windowDays", count: days };
    }

    const hours = durationMinutes / MINUTES_PER_HOUR;
    return Number.isInteger(hours)
        ? { key: "windowHours", count: hours }
        : { key: "windowMinutes", count: durationMinutes };
}
