/**
 * Each vendor states a reset time in its own unit — an ISO string, epoch seconds, epoch
 * milliseconds — so the caller builds the Date and this only decides whether the result is
 * carryable. A reset time that did not parse is dropped rather than shown as the epoch.
 */
export function allowanceInstant(value: Date | null | undefined): string | null {
    if (value === null || value === undefined || Number.isNaN(value.getTime())) {
        return null;
    }
    return value.toISOString();
}
