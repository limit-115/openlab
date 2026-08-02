import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
    HarnessAuthenticationMethods,
    HarnessEffortLevels,
    HarnessInputSources,
    HarnessKinds,
    HarnessTimeoutMilliseconds
} from "#src/agent-harness/agent-harness.const";
import {
    captureSuccess,
    FakeHarnessProcessRunner,
    streamUntilAbort
} from "#src/cli-execution/cli-process-runner.fixture";
import { testEnvironment } from "#src/cli-execution/subscription-environment.fixture";
import {
    CodexTestCliValues,
    CodexTestLoginMarkers,
    CodexTestNativeEventTypes
} from "#src/codex-cli/codex-cli.fixture";
import { CodexHarness } from "#src/codex-cli/codex-harness";
import {
    harnessRequest,
    lastCompleted,
    removeHarnessRunDirectories,
    TestTimeoutMilliseconds
} from "#src/subscription-cli-harness/harness-run.fixture";
import { HarnessArtifactFiles } from "#src/subscription-cli-harness/harness-run-artifacts.const";
import { writeStartedRunManifest } from "#src/subscription-cli-harness/harness-run-manifest";
import { readFinishedRunOutcome } from "#src/subscription-cli-harness/harness-run-outcome";

afterEach(removeHarnessRunDirectories);

describe("readFinishedRunOutcome", () => {
    it("recovers the end of a run that its event log cannot hold", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(CodexTestCliValues.VERSION),
            captureSuccess(CodexTestLoginMarkers.CHATGPT)
        ]);
        runner.nextStream = (request) =>
            streamUntilAbort(request, [
                { type: CodexTestNativeEventTypes.THREAD_STARTED, thread_id: "abandoned-session" }
            ]);
        const harness = new CodexHarness({ runner, environment: testEnvironment() });
        const request = await harnessRequest("codex-outcome", {
            timeoutMs: TestTimeoutMilliseconds.WATCHDOG
        });

        const { result } = lastCompleted(await Array.fromAsync(harness.run(request)));

        expect(await readFinishedRunOutcome(request.artifactDirectory)).toEqual({
            status: result.status,
            error: result.error,
            finishedAt: result.finishedAt
        });
    });

    it("reports nothing for a run whose manifest still says it is going", async () => {
        const request = await harnessRequest("codex-running");
        await mkdir(request.artifactDirectory, { recursive: true });
        const manifestPath = join(request.artifactDirectory, HarnessArtifactFiles.MANIFEST);
        await writeStartedRunManifest(manifestPath, {
            kind: HarnessKinds.CODEX,
            cliVersion: CodexTestCliValues.VERSION,
            authentication: {
                method: HarnessAuthenticationMethods.CHATGPT,
                subscription: null
            },
            session: { model: "gpt-5", effort: HarnessEffortLevels.HIGH },
            command: {
                file: "codex",
                args: [],
                cwd: request.cwd,
                stdin: HarnessInputSources.PROMPT,
                removedEnvironmentVariables: []
            },
            startedAt: "2026-08-03T10:00:00.000Z",
            timeoutMs: HarnessTimeoutMilliseconds.RUN,
            prompt: { path: "prompt.txt", bytes: 1, sha256: "sha" }
        });

        expect(await readFinishedRunOutcome(request.artifactDirectory)).toBeUndefined();
    });
});
