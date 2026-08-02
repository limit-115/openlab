export function calculateLeaseExpiry(now: Date, leaseDurationMs: number): Date {
    if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs < 1) {
        throw new RangeError("Lease duration must be a positive safe integer");
    }
    return new Date(now.getTime() + leaseDurationMs);
}
