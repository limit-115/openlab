import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { HarnessRunStatuses } from "#src/agent-harness/agent-harness.const";
import { HarnessEventTypes } from "#src/agent-harness/harness-event.const";
import type { HarnessEvent } from "#src/agent-harness/harness-event.types";
import {
    harnessRequest,
    lastCompleted,
    removeHarnessRunDirectories,
    TestTimeoutMilliseconds
} from "#src/cli-agent-harness/harness-run.fixture";
import {
    captureCancellationOnAbort,
    captureSuccess,
    FakeHarnessProcessRunner,
    invalidStreamUntilAbort,
    streamUntilAbort,
    TestProcessSignals
} from "#src/cli-execution/cli-process-runner.fixture";
import type { HarnessProcessExit } from "#src/cli-execution/cli-process-runner.types";
import { testEnvironment } from "#src/cli-execution/harness-environment.fixture";
import { HarnessAbortedError } from "#src/cli-execution/harness-error";
import { HarnessErrorCodes, HarnessTimeoutPhases } from "#src/cli-execution/harness-error.const";
import {
    CodexTestCliValues,
    CodexTestLoginMarkers,
    CodexTestNativeEventTypes
} from "#src/codex-cli/codex-cli.fixture";
import { CodexHarness } from "#src/codex-cli/codex-harness";

afterEach(removeHarnessRunDirectories);

describe("CLI agent harness run lifecycle", () => {
    it("honors an already-aborted signal before invoking a CLI", async () => {
        const runner = new FakeHarnessProcessRunner([]);
        const harness = new CodexHarness({ runner, environment: testEnvironment() });
        const controller = new AbortController();
        controller.abort(new Error("stop"));

        await expect(harness.preflight(controller.signal)).rejects.toBeInstanceOf(
            HarnessAbortedError
        );
        expect(runner.captureRequests).toHaveLength(0);
    });

    it("times out preflight with a distinct actionable error", async () => {
        const runner = new FakeHarnessProcessRunner([
            (request) => captureCancellationOnAbort(request)
        ]);
        const harness = new CodexHarness({
            runner,
            environment: testEnvironment(),
            preflightTimeoutMs: TestTimeoutMilliseconds.WATCHDOG
        });

        await expect(harness.preflight()).rejects.toMatchObject({
            code: HarnessErrorCodes.TIMED_OUT,
            message: `codex harness preflight timed out after ${TestTimeoutMilliseconds.WATCHDOG} ms`,
            phase: HarnessTimeoutPhases.PREFLIGHT,
            timeoutMs: TestTimeoutMilliseconds.WATCHDOG
        });
        expect(runner.captureRequests[0]?.signal?.aborted).toBe(true);
        expect(runner.spawnRequests).toHaveLength(0);
    });

    it("records a timed-out run with an explicit status and terminal artifacts", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(CodexTestCliValues.VERSION),
            captureSuccess(CodexTestLoginMarkers.CHATGPT)
        ]);
        runner.nextStream = (request) =>
            streamUntilAbort(request, [
                {
                    type: CodexTestNativeEventTypes.THREAD_STARTED,
                    thread_id: "timed-out-session"
                }
            ]);
        const harness = new CodexHarness({ runner, environment: testEnvironment() });
        const request = await harnessRequest("codex-timeout", {
            timeoutMs: TestTimeoutMilliseconds.WATCHDOG
        });

        const events = await Array.fromAsync(harness.run(request));
        const completed = lastCompleted(events);
        const expectedError = `codex harness run timed out after ${TestTimeoutMilliseconds.WATCHDOG} ms`;

        expect(completed.result).toMatchObject({
            status: HarnessRunStatuses.TIMED_OUT,
            error: expectedError,
            timeoutMs: TestTimeoutMilliseconds.WATCHDOG,
            sessionId: "timed-out-session"
        });
        expect(events).toContainEqual(
            expect.objectContaining({
                type: HarnessEventTypes.DIAGNOSTIC,
                message: expectedError
            })
        );
        expect(runner.spawnRequests[0]?.signal?.aborted).toBe(true);
        await expect(
            readFile(completed.result.artifacts.manifest.path, "utf8").then(JSON.parse)
        ).resolves.toMatchObject({
            status: HarnessRunStatuses.TIMED_OUT,
            error: expectedError,
            timeoutMs: TestTimeoutMilliseconds.WATCHDOG
        });
        await expect(readFile(completed.result.artifacts.events.path, "utf8")).resolves.toContain(
            expectedError
        );
    });

    it("records an internally cancelled protocol failure as failed", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(CodexTestCliValues.VERSION),
            captureSuccess(CodexTestLoginMarkers.CHATGPT)
        ]);
        runner.nextStream = (request) => invalidStreamUntilAbort(request);
        const harness = new CodexHarness({ runner, environment: testEnvironment() });
        const request = await harnessRequest("codex-invalid-stream");

        const completed = lastCompleted(await Array.fromAsync(harness.run(request)));

        expect(completed.result).toMatchObject({
            status: HarnessRunStatuses.FAILED,
            error: expect.stringContaining("emitted invalid JSONL")
        });
    });

    it("validates configured and per-run watchdog durations", async () => {
        expect(
            () =>
                new CodexHarness({
                    environment: testEnvironment(),
                    preflightTimeoutMs: TestTimeoutMilliseconds.INVALID
                })
        ).toThrow("Preflight timeout must be an integer between");

        const harness = new CodexHarness({
            runner: new FakeHarnessProcessRunner([]),
            environment: testEnvironment()
        });
        const request = await harnessRequest("invalid-timeout", {
            timeoutMs: TestTimeoutMilliseconds.INVALID
        });

        await expect(Array.fromAsync(harness.run(request))).rejects.toMatchObject({
            code: HarnessErrorCodes.INVALID_REQUEST,
            message: expect.stringContaining("Run timeout must be an integer between")
        });
    });

    it("propagates AbortSignal to a running CLI and records cancellation", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(CodexTestCliValues.VERSION),
            captureSuccess(CodexTestLoginMarkers.CHATGPT)
        ]);
        runner.nextStream = (request) => {
            const completed = new Promise<HarnessProcessExit>((resolveExit) => {
                request.signal?.addEventListener(
                    "abort",
                    () => {
                        resolveExit({
                            exitCode: null,
                            signal: TestProcessSignals.TERMINATE,
                            failed: true,
                            cancelled: true,
                            stderr: "cancelled",
                            error: "cancelled"
                        });
                    },
                    { once: true }
                );
            });
            return {
                stdout: Readable.from([
                    `${JSON.stringify({
                        type: CodexTestNativeEventTypes.THREAD_STARTED,
                        thread_id: "cancelled-session"
                    })}\n`
                ]),
                completed
            };
        };
        const harness = new CodexHarness({ runner, environment: testEnvironment() });
        const request = await harnessRequest("codex-cancelled");
        const controller = new AbortController();
        const iterator = harness.run(request, controller.signal)[Symbol.asyncIterator]();

        await expect(iterator.next()).resolves.toMatchObject({
            value: { type: HarnessEventTypes.SESSION_STARTED }
        });
        controller.abort(new Error("stop running agent"));
        const remaining: HarnessEvent[] = [];
        for (;;) {
            const next = await iterator.next();
            if (next.done) {
                break;
            }
            remaining.push(next.value);
        }

        expect(lastCompleted(remaining).result.status).toBe(HarnessRunStatuses.CANCELLED);
        expect(runner.spawnRequests[0]?.signal?.aborted).toBe(true);
    });
});
