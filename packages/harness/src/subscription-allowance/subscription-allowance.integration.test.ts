import { describe, expect, it } from "vitest";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { readSubscriptionAllowance } from "#src/subscription-allowance/subscription-allowance";

/**
 * Reads the operator's real subscriptions through the local logins. A failure here is the reading
 * this feature exists to take: either a vendor changed the shape it answers with, or the machine is
 * no longer signed in to the plan the lab claims to run on.
 */
describe.each([HarnessKinds.CLAUDE, HarnessKinds.CODEX, HarnessKinds.GLM])(
    "readSubscriptionAllowance(%s)",
    (kind) => {
        it("reports a metered window against a named plan", async () => {
            const allowance = await readSubscriptionAllowance(kind);

            expect(allowance.kind).toBe(kind);
            expect(allowance.plan).not.toBeNull();
            expect(allowance.windows.length).toBeGreaterThan(0);
            for (const window of allowance.windows) {
                expect(window.durationMinutes).toBeGreaterThan(0);
                expect(window.usedPercent).toBeGreaterThanOrEqual(0);
            }
        });
    }
);
