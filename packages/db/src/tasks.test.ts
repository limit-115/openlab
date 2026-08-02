import { describe, expect, it } from "vitest";
import { calculateLeaseExpiry } from "#src/tasks";

describe("calculateLeaseExpiry", () => {
    it("calculates an absolute expiry without mutating the supplied clock", () => {
        const now = new Date("2026-08-02T00:00:00.000Z");

        expect(calculateLeaseExpiry(now, 30_000).toISOString()).toBe("2026-08-02T00:00:30.000Z");
        expect(now.toISOString()).toBe("2026-08-02T00:00:00.000Z");
    });

    it("rejects invalid lease durations", () => {
        expect(() => calculateLeaseExpiry(new Date(), 0)).toThrow(RangeError);
        expect(() => calculateLeaseExpiry(new Date(), Number.POSITIVE_INFINITY)).toThrow(
            RangeError
        );
    });
});
