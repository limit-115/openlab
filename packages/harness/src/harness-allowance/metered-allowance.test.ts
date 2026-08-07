import { describe, expect, it } from "vitest";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { readDeepseekAllowance } from "#src/harness-allowance/deepseek-allowance";
import { readMuseAllowance } from "#src/harness-allowance/muse-allowance";

/**
 * The two token-billed harnesses answer in money, and money used to be reported in the field a plan
 * tier goes in — so the page rendered a wallet balance as though it named a plan the operator had
 * bought, styled and capitalised like one. A tier and money are separate readings now.
 */
describe("allowance readings for a token-billed harness", () => {
    it("reports a DeepSeek wallet as money per currency and names no plan", async () => {
        const allowance = await readDeepseekAllowance(undefined, () =>
            Promise.resolve({
                apiKey: "sk-test",
                available: true,
                balances: [{ currency: "USD", amount: "4.21" }]
            })
        );

        expect(allowance).toEqual({
            kind: HarnessKinds.DEEPSEEK,
            plan: null,
            balances: [{ currency: "USD", amount: "4.21" }],
            spent: false,
            windows: []
        });
    });

    /**
     * Every currency, because a floor is set under one of them. Folding a wallet into a single line
     * would leave the operator unable to say which money the lab must stop short of.
     */
    it("carries each currency a wallet pays in rather than one line for all of them", async () => {
        const allowance = await readDeepseekAllowance(undefined, () =>
            Promise.resolve({
                apiKey: "sk-test",
                available: true,
                balances: [
                    { currency: "USD", amount: "4.21" },
                    { currency: "CNY", amount: "30.00" }
                ]
            })
        );

        expect(allowance.balances.map(({ currency }) => currency)).toEqual(["USD", "CNY"]);
    });

    /**
     * The same verdict the preflight refuses a run on. Dropping it left the panel calling a wallet
     * available while the lab was already refusing to dispatch to it, and an operator reading that
     * page had no way to tell why nothing was running.
     */
    it("carries DeepSeek's own verdict that a wallet can no longer be spent", async () => {
        const allowance = await readDeepseekAllowance(undefined, () =>
            Promise.resolve({
                apiKey: "sk-test",
                available: false,
                balances: [{ currency: "USD", amount: "0.00" }]
            })
        );

        expect(allowance.spent).toBe(true);
    });

    /** Meta meters neither way, so both meters come back empty and no window can be capped. */
    it("reports Muse Code as an account with neither meter to read", async () => {
        const allowance = await readMuseAllowance();

        expect(allowance.plan).toBeNull();
        expect(allowance.balances).toEqual([]);
        expect(allowance.windows).toEqual([]);
    });
});
