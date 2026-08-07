import { describe, expect, it } from "vitest";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { readDeepseekAllowance } from "#src/harness-allowance/deepseek-allowance";
import { readMuseAllowance } from "#src/harness-allowance/muse-allowance";

/**
 * The two token-billed harnesses answer in money, and money used to be reported in the field a plan
 * tier goes in — so the page rendered a wallet balance as though it named a plan the operator had
 * bought, styled and capitalised like one. A tier and an amount are separate readings now.
 */
describe("allowance readings for a token-billed harness", () => {
    it("reports a DeepSeek wallet as a balance and names no plan", async () => {
        const allowance = await readDeepseekAllowance(undefined, () =>
            Promise.resolve({ apiKey: "sk-test", available: true, balance: "4.21 USD" })
        );

        expect(allowance).toEqual({
            kind: HarnessKinds.DEEPSEEK,
            plan: null,
            balance: "4.21 USD",
            spent: false,
            windows: []
        });
    });

    /**
     * The same verdict the preflight refuses a run on. Dropping it left the panel calling a wallet
     * available while the lab was already refusing to dispatch to it, and an operator reading that
     * page had no way to tell why nothing was running.
     */
    it("carries DeepSeek's own verdict that a wallet can no longer be spent", async () => {
        const allowance = await readDeepseekAllowance(undefined, () =>
            Promise.resolve({ apiKey: "sk-test", available: false, balance: "0.00 USD" })
        );

        expect(allowance.spent).toBe(true);
    });

    /** Meta states nothing, so the balance says that in words and no window can be capped. */
    it("reports Muse Code as a balance Meta does not publish", async () => {
        const allowance = await readMuseAllowance();

        expect(allowance.plan).toBeNull();
        expect(allowance.balance).toMatch(/no balance/iu);
        expect(allowance.windows).toEqual([]);
    });
});
