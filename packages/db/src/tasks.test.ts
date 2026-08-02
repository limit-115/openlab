import { describe, expect, it } from "vitest";
import { ExternalEffect } from "#src/constants";
import { assertRetryIsSafe, calculateLeaseExpiry } from "#src/tasks";

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

describe("assertRetryIsSafe", () => {
    it("allows retrying an irreversible action only with reconciliation", () => {
        expect(() => assertRetryIsSafe(ExternalEffect.IRREVERSIBLE, null, true)).toThrow(
            "cannot be retried without reconciliation"
        );
        expect(() =>
            assertRetryIsSafe(ExternalEffect.IRREVERSIBLE, "operation-1", true)
        ).not.toThrow();
    });

    it("does not require reconciliation when no retry is requested", () => {
        expect(() => assertRetryIsSafe(ExternalEffect.IRREVERSIBLE, null, false)).not.toThrow();
        expect(() => assertRetryIsSafe(ExternalEffect.REVERSIBLE, null, true)).not.toThrow();
    });
});
