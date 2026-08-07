import { describe, expect, it } from "vitest";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { HarnessCapabilityGaps, HarnessErrorCodes } from "#src/cli-execution/harness-error.const";
import { CodexTestUsageLimitMessage } from "#src/codex-cli/codex-cli.fixture";
import { isSpentAllowance, spentAllowanceError } from "#src/spent-allowance/spent-allowance";

describe("spent allowance", () => {
    it("recognises the refusal a vendor sends when the account is spent", () => {
        expect(isSpentAllowance(CodexTestUsageLimitMessage)).toBe(true);
        expect(isSpentAllowance("Claude AI usage limit reached|1786000000")).toBe(true);
        expect(isSpentAllowance("Request failed: 429 too many requests")).toBe(true);
        expect(isSpentAllowance("coding plan quota exhausted")).toBe(true);
        expect(isSpentAllowance("Error: insufficient credits on this account")).toBe(true);
    });

    it("leaves an ordinary run failure alone", () => {
        expect(isSpentAllowance("Codex item event is missing its item payload")).toBe(false);
        expect(isSpentAllowance("apply_patch failed: file not found")).toBe(false);
    });

    it("tells a subscription operator to wait, keeping the reset time the vendor named", () => {
        const error = spentAllowanceError(HarnessKinds.CODEX, CodexTestUsageLimitMessage);

        expect(error.code).toBe(HarnessErrorCodes.CAPABILITY_REQUIRED);
        expect(error.gap).toBe(HarnessCapabilityGaps.ALLOWANCE);
        expect(error.capabilityRequest.reason).toContain("try again at Aug 9th, 2026 6:50 PM");
        expect(error.capabilityRequest.provisioningHint).toContain("reset");
    });

    /**
     * The wallet harnesses are the reason this refusal branches at all. Nothing resets for them, so
     * an operator sent to wait for an allowance or to raise a plan is sent to do something that
     * cannot happen — which is what the lab used to tell them.
     */
    it("tells a token-billed operator to pay rather than to wait for a plan", () => {
        const error = spentAllowanceError(
            HarnessKinds.DEEPSEEK,
            "Error: insufficient credits on this account"
        );

        expect(error.capabilityRequest.provisioningHint).toContain("Add balance");
        expect(error.capabilityRequest.provisioningHint).not.toMatch(/subscription|plan|reset/iu);
        expect(error.message).not.toMatch(/subscription/iu);
        expect(error.capabilityRequest.need).not.toMatch(/subscription|plan/iu);
    });

    /** The clause that told a DeepSeek operator their own billing was forbidden by the lab. */
    it("never tells an operator that usage billing is forbidden", () => {
        for (const harness of [HarnessKinds.CODEX, HarnessKinds.DEEPSEEK, HarnessKinds.MUSE]) {
            const error = spentAllowanceError(harness, "quota exhausted");

            expect(error.capabilityRequest.provisioningHint).not.toMatch(/forbidden/iu);
        }
    });
});
