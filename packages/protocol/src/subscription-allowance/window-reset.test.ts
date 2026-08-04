import { describe, expect, it } from "vitest";
import type { AllowanceWindow } from "#src/subscription-allowance/subscription-allowance.types";
import { latestWindowReset } from "#src/subscription-allowance/window-reset";

function window(resetsAt: string | null): AllowanceWindow {
    return { duration_minutes: 300, used_percent: 100, resets_at: resetsAt };
}

describe("latestWindowReset", () => {
    it("waits for the last window to come back, not the first", () => {
        expect(
            latestWindowReset([
                window("2026-08-05T17:40:00.000Z"),
                window("2026-08-09T13:50:00.000Z")
            ])
        ).toBe("2026-08-09T13:50:00.000Z");
    });

    it("has no answer when the vendor stated no reset time", () => {
        expect(latestWindowReset([window(null)])).toBeUndefined();
        expect(latestWindowReset([])).toBeUndefined();
    });

    it("stands on the reset times it was given rather than on none of them", () => {
        expect(latestWindowReset([window(null), window("2026-08-05T17:40:00.000Z")])).toBe(
            "2026-08-05T17:40:00.000Z"
        );
    });
});
