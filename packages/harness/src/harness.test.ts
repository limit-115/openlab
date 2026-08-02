import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { ClaudeHarness, ClaudePermissionModes } from "#src/claude";
import { CodexHarness, CodexPermissionModes } from "#src/codex";
import {
    HarnessAuthenticationMethods,
    type HarnessEvent,
    HarnessEventTypes,
    HarnessKinds,
    type HarnessRunRequest,
    HarnessRunStatuses,
    HarnessTimeoutMilliseconds
} from "#src/contract";
import {
    isForbiddenHarnessEnvironmentVariable,
    removedHarnessEnvironmentVariables,
    sanitizeHarnessEnvironment
} from "#src/environment";
import {
    HarnessAbortedError,
    HarnessCapabilityError,
    HarnessErrorCodes,
    HarnessTimeoutPhases
} from "#src/errors";
import type {
    HarnessCaptureResult,
    HarnessProcessExit,
    HarnessProcessRequest,
    HarnessProcessRunner,
    HarnessStreamingProcess
} from "#src/process";

const temporaryRoots: string[] = [];

const TestNativeEventTypes = {
    CODEX_THREAD_STARTED: "thread.started",
    CODEX_ITEM_COMPLETED: "item.completed",
    CODEX_TURN_COMPLETED: "turn.completed",
    CLAUDE_SYSTEM: "system",
    CLAUDE_STREAM_EVENT: "stream_event",
    CLAUDE_ASSISTANT: "assistant",
    CLAUDE_RESULT: "result"
} as const;

const TestNativeSubtypes = {
    CLAUDE_INIT: "init"
} as const;

const TestItemTypes = {
    CODEX_AGENT_MESSAGE: "agent_message",
    CLAUDE_TEXT: "text"
} as const;

const TestStreamEventTypes = {
    CONTENT_BLOCK_DELTA: "content_block_delta",
    TEXT_DELTA: "text_delta"
} as const;

const TestResultSubtypes = {
    SUCCESS: "success"
} as const;

const TestApiProviders = {
    FIRST_PARTY: "firstParty",
    BEDROCK: "bedrock"
} as const;

const TestSubscriptionTypes = {
    MAX: "max"
} as const;

const TestLoginMarkers = {
    CHATGPT: "Logged in using ChatGPT",
    CODEX_API_KEY: "Logged in using an API key"
} as const;

const TestCliArgumentValues = {
    COLOR_NEVER: "never",
    STREAM_JSON: "stream-json"
} as const;

const TestTimeoutMilliseconds = {
    WATCHDOG: 10,
    INVALID: 0
} as const;

const TestProcessSignals = {
    TERMINATE: "SIGTERM"
} as const;

afterEach(async () => {
    await Promise.all(
        temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true }))
    );
});

describe("CodexHarness", () => {
    it("builds a subscription-only structured exec command and normalizes JSONL", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess("codex-cli 0.146.0"),
            { ...captureSuccess(""), stderr: TestLoginMarkers.CHATGPT }
        ]);
        runner.nextStream = streamSuccess([
            {
                type: TestNativeEventTypes.CODEX_THREAD_STARTED,
                thread_id: "codex-session"
            },
            {
                type: TestNativeEventTypes.CODEX_ITEM_COMPLETED,
                item: {
                    id: "message-1",
                    type: TestItemTypes.CODEX_AGENT_MESSAGE,
                    text: '{"answer":42}'
                }
            },
            {
                type: TestNativeEventTypes.CODEX_TURN_COMPLETED,
                usage: { input_tokens: 10, output_tokens: 4, cached_input_tokens: 2 }
            }
        ]);
        const environment = testEnvironment();
        const harness = new CodexHarness({ runner, environment });
        const request = await harnessRequest("codex-run", {
            responseSchema: answerSchema()
        });

        const events = await Array.fromAsync(harness.run(request));
        const spawn = runner.spawnRequests[0];
        const completed = lastCompleted(events);

        expect(CodexPermissionModes.UNRESTRICTED).toBeDefined();
        expect(runner.captureRequests.map((capture) => capture.args)).toEqual([
            ["--version"],
            ["login", "status"]
        ]);
        expect(spawn?.args).toEqual([
            "exec",
            "--color",
            TestCliArgumentValues.COLOR_NEVER,
            "--json",
            "--ignore-user-config",
            "--skip-git-repo-check",
            "--dangerously-bypass-approvals-and-sandbox",
            "--output-schema",
            expect.stringMatching(/response-schema\.json$/),
            "-"
        ]);
        expect(spawn?.input).toBe(request.prompt);
        expect(spawn?.environment.PATH).toBe("/test/bin");
        expect(spawn?.environment.OPENAI_API_KEY).toBeUndefined();
        expect(spawn?.environment.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
        expect(events).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: HarnessEventTypes.SESSION_STARTED,
                    sessionId: "codex-session",
                    resumed: false
                }),
                expect.objectContaining({
                    type: HarnessEventTypes.STRUCTURED_OUTPUT,
                    value: { answer: 42 }
                }),
                expect.objectContaining({
                    type: HarnessEventTypes.USAGE,
                    inputTokens: 10,
                    outputTokens: 4,
                    cachedInputTokens: 2
                })
            ])
        );
        expect(completed.result).toMatchObject({
            kind: HarnessKinds.CODEX,
            status: HarnessRunStatuses.SUCCEEDED,
            cliVersion: "codex-cli 0.146.0",
            authentication: {
                method: HarnessAuthenticationMethods.CHATGPT,
                subscription: null
            },
            sessionId: "codex-session",
            structuredOutput: { answer: 42 },
            exitCode: 0,
            timeoutMs: HarnessTimeoutMilliseconds.RUN
        });
        await expect(
            readFile(completed.result.artifacts.nativeEvents.path, "utf8")
        ).resolves.toContain(TestNativeEventTypes.CODEX_THREAD_STARTED);
        await expect(readFile(completed.result.artifacts.manifest.path, "utf8")).resolves.toContain(
            `"status": "${HarnessRunStatuses.SUCCEEDED}"`
        );
    });

    it("constructs resume without exposing the prompt in argv", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess("codex-cli 0.146.0"),
            captureSuccess(TestLoginMarkers.CHATGPT)
        ]);
        runner.nextStream = streamSuccess([
            {
                type: TestNativeEventTypes.CODEX_THREAD_STARTED,
                thread_id: "existing-session"
            },
            {
                type: TestNativeEventTypes.CODEX_ITEM_COMPLETED,
                item: {
                    id: "message-2",
                    type: TestItemTypes.CODEX_AGENT_MESSAGE,
                    text: "continued"
                }
            }
        ]);
        const harness = new CodexHarness({ runner, environment: testEnvironment() });
        const request = await harnessRequest("codex-resume", {
            resumeSessionId: "existing-session",
            model: "gpt-subscription-model"
        });

        const events = await Array.fromAsync(harness.run(request));

        expect(runner.spawnRequests[0]?.args).toEqual([
            "exec",
            "resume",
            "--json",
            "--ignore-user-config",
            "--skip-git-repo-check",
            "--dangerously-bypass-approvals-and-sandbox",
            "--model",
            "gpt-subscription-model",
            "existing-session",
            "-"
        ]);
        expect(runner.spawnRequests[0]?.args).not.toContain(request.prompt);
        expect(events).toContainEqual(
            expect.objectContaining({ type: HarnessEventTypes.SESSION_STARTED, resumed: true })
        );
    });

    it("rejects API-key authentication instead of falling back", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess("codex-cli 0.146.0"),
            captureSuccess(TestLoginMarkers.CODEX_API_KEY)
        ]);
        const harness = new CodexHarness({ runner, environment: testEnvironment() });

        await expect(harness.preflight()).rejects.toMatchObject({
            code: HarnessErrorCodes.SUBSCRIPTION_AUTH_REQUIRED,
            harness: HarnessKinds.CODEX,
            capabilityRequest: {
                need: expect.stringContaining("ChatGPT")
            }
        });
        expect(runner.spawnRequests).toHaveLength(0);
    });
});

describe("ClaudeHarness", () => {
    it("requires claude.ai auth, builds stream-json, and parses structured output", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess("2.1.220 (Claude Code)"),
            captureSuccess(
                JSON.stringify({
                    loggedIn: true,
                    authMethod: HarnessAuthenticationMethods.CLAUDE_AI,
                    apiProvider: TestApiProviders.FIRST_PARTY,
                    subscriptionType: TestSubscriptionTypes.MAX
                })
            )
        ]);
        runner.nextStream = streamSuccess([
            {
                type: TestNativeEventTypes.CLAUDE_SYSTEM,
                subtype: TestNativeSubtypes.CLAUDE_INIT,
                session_id: "claude-session"
            },
            {
                type: TestNativeEventTypes.CLAUDE_STREAM_EVENT,
                session_id: "claude-session",
                event: {
                    type: TestStreamEventTypes.CONTENT_BLOCK_DELTA,
                    delta: { type: TestStreamEventTypes.TEXT_DELTA, text: "forty" }
                }
            },
            {
                type: TestNativeEventTypes.CLAUDE_ASSISTANT,
                session_id: "claude-session",
                message: {
                    content: [{ type: TestItemTypes.CLAUDE_TEXT, text: "forty-two" }]
                }
            },
            {
                type: TestNativeEventTypes.CLAUDE_RESULT,
                subtype: TestResultSubtypes.SUCCESS,
                is_error: false,
                session_id: "claude-session",
                structured_output: { answer: 42 },
                usage: { input_tokens: 8, output_tokens: 3, cache_read_input_tokens: 1 }
            }
        ]);
        const harness = new ClaudeHarness({ runner, environment: testEnvironment() });
        const request = await harnessRequest("claude-run", {
            responseSchema: answerSchema()
        });

        const events = await Array.fromAsync(harness.run(request));
        const spawn = runner.spawnRequests[0];
        const completed = lastCompleted(events);

        expect(ClaudePermissionModes.BYPASS_PERMISSIONS).toBeDefined();
        expect(runner.captureRequests.map((capture) => capture.args)).toEqual([
            ["--version"],
            ["--setting-sources", "", "auth", "status", "--json"]
        ]);
        expect(spawn?.args).toEqual([
            "-p",
            "--output-format",
            TestCliArgumentValues.STREAM_JSON,
            "--verbose",
            "--include-partial-messages",
            "--dangerously-skip-permissions",
            "--permission-mode",
            ClaudePermissionModes.BYPASS_PERMISSIONS,
            "--setting-sources",
            "",
            "--json-schema",
            JSON.stringify(answerSchema())
        ]);
        expect(spawn?.args).not.toContain("--fallback-model");
        expect(spawn?.input).toBe(request.prompt);
        expect(events).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: HarnessEventTypes.ASSISTANT_DELTA,
                    text: "forty"
                }),
                expect.objectContaining({
                    type: HarnessEventTypes.ASSISTANT_COMPLETED,
                    text: "forty-two"
                }),
                expect.objectContaining({
                    type: HarnessEventTypes.STRUCTURED_OUTPUT,
                    value: { answer: 42 }
                })
            ])
        );
        expect(completed.result).toMatchObject({
            kind: HarnessKinds.CLAUDE,
            status: HarnessRunStatuses.SUCCEEDED,
            authentication: {
                method: HarnessAuthenticationMethods.CLAUDE_AI,
                subscription: TestSubscriptionTypes.MAX
            },
            sessionId: "claude-session"
        });
    });

    it("rejects non-subscription and third-party auth JSON", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess("2.1.220 (Claude Code)"),
            captureSuccess(
                JSON.stringify({
                    loggedIn: true,
                    authMethod: HarnessAuthenticationMethods.CLAUDE_AI,
                    apiProvider: TestApiProviders.BEDROCK,
                    subscriptionType: TestSubscriptionTypes.MAX
                })
            )
        ]);
        const harness = new ClaudeHarness({ runner, environment: testEnvironment() });

        await expect(harness.preflight()).rejects.toBeInstanceOf(HarnessCapabilityError);
        expect(runner.spawnRequests).toHaveLength(0);
    });
});

describe("harness process isolation", () => {
    it("strips model API credentials and billing routes while retaining local CLI auth state", () => {
        const environment = testEnvironment();
        const sanitized = sanitizeHarnessEnvironment(environment);

        expect(sanitized).toEqual({
            PATH: "/test/bin",
            CODEX_HOME: "/test/codex-home",
            HOME: "/test/home"
        });
        expect(removedHarnessEnvironmentVariables(environment)).toEqual([
            "ANTHROPIC_API_KEY",
            "ANTHROPIC_AUTH_TOKEN",
            "ANTHROPIC_BASE_URL",
            "CLAUDE_CODE_OAUTH_TOKEN",
            "CLAUDE_CODE_USE_BEDROCK",
            "CLAUDE_CODE_USE_FOUNDRY",
            "CLAUDE_CODE_USE_VERTEX",
            "CODEX_API_KEY",
            "OPENAI_API_KEY",
            "OPENAI_BASE_URL"
        ]);
        expect(isForbiddenHarnessEnvironmentVariable("OPENAI_API_FUTURE_ROUTE")).toBe(true);
        expect(isForbiddenHarnessEnvironmentVariable("CODEX_HOME")).toBe(false);
    });

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
            captureSuccess("codex-cli 0.146.0"),
            captureSuccess(TestLoginMarkers.CHATGPT)
        ]);
        runner.nextStream = (request) =>
            streamUntilAbort(request, [
                {
                    type: TestNativeEventTypes.CODEX_THREAD_STARTED,
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
            captureSuccess("codex-cli 0.146.0"),
            captureSuccess(TestLoginMarkers.CHATGPT)
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
            captureSuccess("codex-cli 0.146.0"),
            captureSuccess(TestLoginMarkers.CHATGPT)
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
                        type: TestNativeEventTypes.CODEX_THREAD_STARTED,
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

class FakeHarnessProcessRunner implements HarnessProcessRunner {
    readonly captureRequests: HarnessProcessRequest[] = [];
    readonly spawnRequests: HarnessProcessRequest[] = [];
    readonly #captureResults: FakeCaptureResult[];
    nextStream:
        | HarnessStreamingProcess
        | ((request: HarnessProcessRequest) => HarnessStreamingProcess)
        | undefined;

    constructor(captureResults: readonly FakeCaptureResult[]) {
        this.#captureResults = [...captureResults];
    }

    async capture(request: HarnessProcessRequest): Promise<HarnessCaptureResult> {
        this.captureRequests.push(request);
        const result = this.#captureResults.shift();
        if (!result) {
            throw new Error("No fake capture result configured");
        }
        return typeof result === "function" ? result(request) : result;
    }

    spawn(request: HarnessProcessRequest): HarnessStreamingProcess {
        this.spawnRequests.push(request);
        if (!this.nextStream) {
            throw new Error("No fake stream result configured");
        }
        return typeof this.nextStream === "function" ? this.nextStream(request) : this.nextStream;
    }
}

type FakeCaptureResult =
    | HarnessCaptureResult
    | ((request: HarnessProcessRequest) => Promise<HarnessCaptureResult>);

function captureSuccess(stdout: string): HarnessCaptureResult {
    return {
        stdout,
        exitCode: 0,
        signal: null,
        failed: false,
        cancelled: false,
        stderr: "",
        error: null
    };
}

function streamSuccess(
    events: readonly Readonly<Record<string, unknown>>[]
): HarnessStreamingProcess {
    const exit: HarnessProcessExit = {
        exitCode: 0,
        signal: null,
        failed: false,
        cancelled: false,
        stderr: "",
        error: null
    };
    return {
        stdout: Readable.from(events.map((event) => `${JSON.stringify(event)}\n`)),
        completed: Promise.resolve(exit)
    };
}

function captureCancellationOnAbort(request: HarnessProcessRequest): Promise<HarnessCaptureResult> {
    return new Promise((resolveCapture) => {
        const resolve = () =>
            resolveCapture({
                stdout: "",
                exitCode: null,
                signal: TestProcessSignals.TERMINATE,
                failed: true,
                cancelled: true,
                stderr: "watchdog cancelled preflight",
                error: "watchdog cancelled preflight"
            });
        if (request.signal?.aborted) {
            resolve();
            return;
        }
        request.signal?.addEventListener("abort", resolve, { once: true });
    });
}

function streamUntilAbort(
    request: HarnessProcessRequest,
    events: readonly Readonly<Record<string, unknown>>[]
): HarnessStreamingProcess {
    const completed = new Promise<HarnessProcessExit>((_resolveExit, rejectExit) => {
        const reject = () => rejectExit(new Error("watchdog rejected the run process"));
        if (request.signal?.aborted) {
            reject();
            return;
        }
        request.signal?.addEventListener("abort", reject, { once: true });
    });
    return {
        stdout: Readable.from(events.map((event) => `${JSON.stringify(event)}\n`)),
        completed
    };
}

function invalidStreamUntilAbort(request: HarnessProcessRequest): HarnessStreamingProcess {
    const completed = new Promise<HarnessProcessExit>((resolveExit) => {
        request.signal?.addEventListener(
            "abort",
            () => {
                resolveExit({
                    exitCode: null,
                    signal: TestProcessSignals.TERMINATE,
                    failed: true,
                    cancelled: true,
                    stderr: "protocol failure cancelled run",
                    error: "protocol failure cancelled run"
                });
            },
            { once: true }
        );
    });
    return {
        stdout: Readable.from(["not-json\n"]),
        completed
    };
}

async function harnessRequest(
    name: string,
    overrides: Partial<HarnessRunRequest> = {}
): Promise<HarnessRunRequest> {
    const root = await mkdtemp(join(tmpdir(), "lab-harness-"));
    temporaryRoots.push(root);
    return {
        prompt: "Solve the research task",
        cwd: root,
        artifactDirectory: join(root, name),
        ...overrides
    };
}

function answerSchema(): Readonly<Record<string, unknown>> {
    return {
        type: "object",
        properties: { answer: { type: "number" } },
        required: ["answer"],
        additionalProperties: false
    };
}

function testEnvironment(): NodeJS.ProcessEnv {
    return {
        PATH: "/test/bin",
        HOME: "/test/home",
        CODEX_HOME: "/test/codex-home",
        OPENAI_API_KEY: "openai-secret",
        OPENAI_BASE_URL: "https://usage-billed.invalid",
        CODEX_API_KEY: "codex-secret",
        ANTHROPIC_API_KEY: "anthropic-secret",
        ANTHROPIC_AUTH_TOKEN: "anthropic-token",
        ANTHROPIC_BASE_URL: "https://usage-billed.invalid",
        CLAUDE_CODE_OAUTH_TOKEN: "oauth-token",
        CLAUDE_CODE_USE_BEDROCK: "1",
        CLAUDE_CODE_USE_VERTEX: "1",
        CLAUDE_CODE_USE_FOUNDRY: "1"
    };
}

function lastCompleted(events: readonly HarnessEvent[]) {
    const event = events.at(-1);
    expect(event?.type).toBe(HarnessEventTypes.RUN_COMPLETED);
    if (event?.type !== HarnessEventTypes.RUN_COMPLETED) {
        throw new Error("Expected terminal harness event");
    }
    return event;
}
