import { describe, expect, it } from "vitest";
import {
    captureSuccess,
    FakeHarnessProcessRunner
} from "#src/cli-execution/cli-process-runner.fixture";
import { testEnvironment } from "#src/cli-execution/harness-environment.fixture";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import { HarnessCapabilityGaps } from "#src/cli-execution/harness-error.const";
import { CodexTestCliValues, CodexTestLoginMarkers } from "#src/codex-cli/codex-cli.fixture";
import { CodexHarness } from "#src/codex-cli/codex-harness";
import { DeepseekHarness } from "#src/deepseek-cli/deepseek-harness";

function preflightRefusal(...captures: readonly ReturnType<typeof captureSuccess>[]) {
    const harness = new CodexHarness({
        runner: new FakeHarnessProcessRunner(captures),
        environment: testEnvironment()
    });
    return harness.preflight().then(
        () => undefined,
        (error: unknown) => error
    );
}

/**
 * A harness that will not run is two different jobs for whoever has to fix it, and the preflight is
 * the only place that can tell them apart: it has seen whether the CLI answered before it asked the
 * CLI who it is signed in as.
 */
describe("runHarnessPreflight", () => {
    it("reports a CLI that is not there as a missing installation", async () => {
        const refusal = await preflightRefusal({
            ...captureSuccess(""),
            failed: true,
            exitCode: null,
            error: "spawn codex ENOENT"
        });

        expect(refusal).toBeInstanceOf(HarnessCapabilityError);
        expect(refusal).toMatchObject({ gap: HarnessCapabilityGaps.INSTALLATION });
    });

    it("reports an installed CLI signed in the wrong way as a missing subscription", async () => {
        const refusal = await preflightRefusal(captureSuccess(CodexTestCliValues.VERSION), {
            ...captureSuccess(CodexTestLoginMarkers.API_KEY),
            failed: true
        });

        expect(refusal).toBeInstanceOf(HarnessCapabilityError);
        expect(refusal).toMatchObject({ gap: HarnessCapabilityGaps.CREDENTIAL });
    });

    /**
     * This refusal is the one sentence all five harnesses share, and two of them have no subscription
     * to be asked for: DeepSeek authenticates with a key the operator hands over and Muse Code with a
     * Meta login. Asking either to sign in to a product subscription sends them after something that
     * does not exist, and the capability card shows the sentence verbatim.
     */
    it("asks a token-billed harness for its CLI rather than for a subscription", async () => {
        const harness = new DeepseekHarness({
            runner: new FakeHarnessProcessRunner([
                { ...captureSuccess(""), failed: true, exitCode: null, error: "spawn codex ENOENT" }
            ]),
            environment: testEnvironment(),
            resolveWallet: () =>
                Promise.resolve({ apiKey: "sk-test", available: true, balance: "1.00 USD" })
        });

        const refusal = await harness.preflight().then(
            () => undefined,
            (error: unknown) => error
        );

        expect(refusal).toBeInstanceOf(HarnessCapabilityError);
        const capability = (refusal as HarnessCapabilityError).capabilityRequest;
        expect(capability.provisioningHint).toContain("Install");
        for (const sentence of [
            (refusal as HarnessCapabilityError).message,
            capability.need,
            capability.reason,
            capability.provisioningHint
        ]) {
            expect(sentence).not.toMatch(/subscription/iu);
        }
    });
});
