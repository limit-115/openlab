import { describe, expect, it } from "vitest";
import {
    captureSuccess,
    FakeHarnessProcessRunner
} from "#src/cli-execution/cli-process-runner.fixture";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import { HarnessCapabilityGaps } from "#src/cli-execution/harness-error.const";
import { testEnvironment } from "#src/cli-execution/subscription-environment.fixture";
import { CodexTestCliValues, CodexTestLoginMarkers } from "#src/codex-cli/codex-cli.fixture";
import { CodexHarness } from "#src/codex-cli/codex-harness";

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
describe("runSubscriptionPreflight", () => {
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
        expect(refusal).toMatchObject({ gap: HarnessCapabilityGaps.SUBSCRIPTION });
    });
});
