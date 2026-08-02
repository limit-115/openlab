import { describe, expect, it } from "vitest";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { HarnessErrorCodes } from "#src/cli-execution/harness-error.const";
import { CodexTestUsageLimitMessage } from "#src/codex-cli/codex-cli.fixture";
import {
    isSubscriptionUsageLimit,
    subscriptionUsageLimitError
} from "#src/subscription-usage-limit/subscription-usage-limit";

describe("subscription usage limit", () => {
    it("recognises the refusal a vendor sends when the allowance is spent", () => {
        expect(isSubscriptionUsageLimit(CodexTestUsageLimitMessage)).toBe(true);
        expect(isSubscriptionUsageLimit("Claude AI usage limit reached|1786000000")).toBe(true);
        expect(isSubscriptionUsageLimit("Request failed: 429 too many requests")).toBe(true);
        expect(isSubscriptionUsageLimit("coding plan quota exhausted")).toBe(true);
    });

    it("leaves an ordinary run failure alone", () => {
        expect(isSubscriptionUsageLimit("Codex item event is missing its item payload")).toBe(
            false
        );
        expect(isSubscriptionUsageLimit("apply_patch failed: file not found")).toBe(false);
    });

    it("asks the operator for the account and keeps the reset time the vendor named", () => {
        const error = subscriptionUsageLimitError(HarnessKinds.CODEX, CodexTestUsageLimitMessage);

        expect(error.code).toBe(HarnessErrorCodes.SUBSCRIPTION_AUTH_REQUIRED);
        expect(error.harness).toBe(HarnessKinds.CODEX);
        expect(error.capabilityRequest.reason).toContain("try again at Aug 9th, 2026 6:50 PM");
        expect(error.capabilityRequest.provisioningHint).toContain("API billing is forbidden");
    });
});
