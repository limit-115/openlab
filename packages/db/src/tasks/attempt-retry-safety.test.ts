import { describe, expect, it } from "vitest";
import { ExternalEffect } from "#src/tasks/attempt-execution.const";
import { assertRetryIsSafe } from "#src/tasks/attempt-retry-safety";

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
