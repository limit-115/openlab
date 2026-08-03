const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;

/**
 * Names a window in the unit a vendor bills it in. A rolling day is called twenty-four hours rather
 * than one day, because it is the clock that resets and not the calendar.
 */
export function allowanceWindowLabel(durationMinutes: number): string {
    const days = durationMinutes / MINUTES_PER_DAY;
    if (Number.isInteger(days)) {
        return days === 1 ? "24 hours" : `${days} days`;
    }

    const hours = durationMinutes / MINUTES_PER_HOUR;
    return Number.isInteger(hours) ? `${hours} hours` : `${durationMinutes} minutes`;
}
