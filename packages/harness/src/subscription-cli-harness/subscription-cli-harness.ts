import { resolve } from "node:path";
import { createInterface } from "node:readline";
import {
    type HarnessInputSource,
    HarnessInputSources,
    type HarnessKind,
    HarnessTimeoutMilliseconds
} from "#src/agent-harness/agent-harness.const";
import type {
    AgentHarness,
    HarnessAuthentication,
    HarnessCommandRecord,
    HarnessPreflight,
    HarnessRunRequest,
    HarnessRunResult,
    HarnessSession
} from "#src/agent-harness/agent-harness.types";
import { HarnessDiagnosticLevels, HarnessEventTypes } from "#src/agent-harness/harness-event.const";
import type { HarnessCompletedEvent, HarnessEvent } from "#src/agent-harness/harness-event.types";
import type { HarnessEventParser } from "#src/agent-harness/harness-event-parser.types";
import { ExecaHarnessProcessRunner } from "#src/cli-execution/cli-process-runner";
import type {
    HarnessCaptureResult,
    HarnessProcessExit,
    HarnessProcessRunner
} from "#src/cli-execution/cli-process-runner.types";
import {
    HarnessCapabilityError,
    HarnessProtocolError,
    HarnessTimeoutError
} from "#src/cli-execution/harness-error";
import { HarnessTimeoutPhases } from "#src/cli-execution/harness-error.const";
import {
    removedHarnessEnvironmentVariables,
    sanitizeHarnessEnvironment
} from "#src/cli-execution/subscription-environment";
import {
    closeRunFiles,
    collectArtifacts,
    createRunFiles,
    writeStderrArtifact
} from "#src/subscription-cli-harness/harness-run-artifacts";
import {
    appendEvent,
    appendNativeEventLine,
    parseNativeEvent,
    stampEvent
} from "#src/subscription-cli-harness/harness-run-events";
import {
    writeFinishedRunManifest,
    writeStartedRunManifest
} from "#src/subscription-cli-harness/harness-run-manifest";
import type { FinishedRunManifest } from "#src/subscription-cli-harness/harness-run-manifest.types";
import { validateHarnessRunRequest } from "#src/subscription-cli-harness/harness-run-request-validation";
import { determineRunStatus } from "#src/subscription-cli-harness/harness-run-status";
import {
    createWatchdogSignal,
    validateTimeoutMilliseconds
} from "#src/subscription-cli-harness/harness-run-watchdog";
import { parseStructuredOutput } from "#src/subscription-cli-harness/response-schema";
import type {
    HarnessCommand,
    HarnessRunPaths,
    SubscriptionHarnessOptions
} from "#src/subscription-cli-harness/subscription-cli-harness.types";
import { runSubscriptionPreflight } from "#src/subscription-cli-harness/subscription-preflight";
import {
    subscriptionUsageLimitError,
    subscriptionUsageLimitMessage
} from "#src/subscription-usage-limit/subscription-usage-limit";

export abstract class SubscriptionCliHarness implements AgentHarness {
    abstract readonly kind: HarnessKind;
    readonly #binary: string;
    readonly #runner: HarnessProcessRunner;
    readonly #sourceEnvironment: Readonly<NodeJS.ProcessEnv>;
    readonly #preflightTimeoutMs: number;

    protected constructor(defaultBinary: string, options: SubscriptionHarnessOptions) {
        this.#binary = options.binary ?? defaultBinary;
        this.#runner = options.runner ?? new ExecaHarnessProcessRunner();
        this.#sourceEnvironment = options.environment ?? process.env;
        this.#preflightTimeoutMs =
            options.preflightTimeoutMs ?? HarnessTimeoutMilliseconds.PREFLIGHT;
        validateTimeoutMilliseconds(this.#preflightTimeoutMs, "Preflight timeout");
    }

    protected abstract authenticationCommand(): readonly string[];
    protected abstract parseAuthentication(
        result: HarnessCaptureResult
    ): HarnessAuthentication | Promise<HarnessAuthentication>;
    protected abstract sessionDefaults(): HarnessSession;
    protected abstract buildCommand(
        request: HarnessRunRequest,
        session: HarnessSession,
        paths: HarnessRunPaths
    ): HarnessCommand;
    protected abstract createEventParser(request: HarnessRunRequest): HarnessEventParser;

    /**
     * Where the CLI expects to find the prompt. Overridden by a harness whose CLI does not read stdin
     * at all: writing a prompt into a pipe nothing reads ends in a binary that exits complaining it
     * was given no prompt, so the choice belongs to the harness that knows its CLI rather than here.
     */
    protected inputSource(): HarnessInputSource {
        return HarnessInputSources.PROMPT;
    }

    /**
     * The text the CLI is given. A CLI that has no structured-output flag has to be asked for its
     * schema in the prompt itself, so the harness that knows this rewrites the request here, once,
     * before the prompt is written down — and what is written down is then what the model read.
     */
    protected promptFor(request: HarnessRunRequest): string {
        return request.prompt;
    }

    /**
     * The environment the CLI runs with, once every inherited provider credential has been stripped.
     * A harness whose subscription credential lives outside the CLI's own login adds it back here,
     * and nowhere else, so the run can never inherit a stray endpoint from the operator's shell.
     */
    protected extendEnvironment(
        sanitized: Record<string, string>
    ): Record<string, string> | Promise<Record<string, string>> {
        return sanitized;
    }

    resolveSession(request: HarnessRunRequest): HarnessSession {
        const defaults = this.sessionDefaults();
        return {
            model: request.model ?? defaults.model,
            effort: request.effort ?? defaults.effort
        };
    }

    async preflight(signal?: AbortSignal): Promise<HarnessPreflight> {
        return this.preflightInDirectory(process.cwd(), signal);
    }

    private async harnessEnvironment(): Promise<Record<string, string>> {
        return this.extendEnvironment(sanitizeHarnessEnvironment(this.#sourceEnvironment));
    }

    private async preflightInDirectory(
        cwd: string,
        signal?: AbortSignal
    ): Promise<HarnessPreflight> {
        return runSubscriptionPreflight(
            {
                kind: this.kind,
                binary: this.#binary,
                runner: this.#runner,
                environment: await this.harnessEnvironment(),
                cwd,
                timeoutMs: this.#preflightTimeoutMs,
                authenticationCommand: this.authenticationCommand(),
                parseAuthentication: (result) => this.parseAuthentication(result)
            },
            signal
        );
    }

    async *run(request: HarnessRunRequest, signal?: AbortSignal): AsyncIterable<HarnessEvent> {
        validateHarnessRunRequest(this.kind, request);
        const timeoutMs = request.timeoutMs ?? HarnessTimeoutMilliseconds.RUN;
        const preflight = await this.preflightInDirectory(resolve(request.cwd), signal);
        const environment = await this.harnessEnvironment();
        const removedEnvironmentVariables = removedHarnessEnvironmentVariables(
            this.#sourceEnvironment
        );
        const session = this.resolveSession(request);
        const prompt = this.promptFor(request);
        const files = await createRunFiles(this.kind, request, prompt);
        const inputSource = this.inputSource();
        const command = this.buildCommand(request, session, {
            prompt: files.prompt.path,
            responseSchema: files.responseSchema?.path
        });
        const commandRecord: HarnessCommandRecord = {
            file: this.#binary,
            args: [...command.args],
            cwd: resolve(request.cwd),
            stdin: inputSource,
            removedEnvironmentVariables
        };
        const startedAt = new Date().toISOString();
        await writeStartedRunManifest(files.manifestPath, {
            kind: this.kind,
            cliVersion: preflight.cliVersion,
            authentication: preflight.authentication,
            session,
            command: commandRecord,
            startedAt,
            timeoutMs,
            prompt: files.prompt,
            ...(files.responseSchema === undefined ? {} : { responseSchema: files.responseSchema })
        });

        const parser = this.createEventParser(request);
        const internalAbortController = new AbortController();
        const watchdog = createWatchdogSignal(timeoutMs, [signal, internalAbortController.signal]);
        let processExit: HarnessProcessExit | undefined;
        let processCompleted: Promise<HarnessProcessExit> | undefined;
        let sequence = 0;
        let streamCompleted = false;
        let semanticError: Error | undefined;
        let usageLimitMessage: string | undefined;
        let structuredOutput: unknown;
        let hasStructuredOutput = false;
        const tailEvents: HarnessEvent[] = [];
        let completedEvent: HarnessCompletedEvent | undefined;

        try {
            const child = this.#runner.spawn({
                file: this.#binary,
                args: command.args,
                cwd: resolve(request.cwd),
                environment,
                ...(inputSource === HarnessInputSources.PROMPT ? { input: prompt } : {}),
                signal: watchdog.signal
            });
            processCompleted = child.completed;
            /**
             * How the process ended is read further down, once its output has been drained. A
             * process that dies before that — killed by the watchdog while the stream is still being
             * written — rejects here with nothing yet waiting on it, and an unobserved rejection
             * takes the daemon down rather than becoming this run's recorded failure. Claiming it
             * now costs nothing and leaves the awaits below to report it.
             */
            void processCompleted.catch(() => undefined);
            const lines = createInterface({
                input: child.stdout,
                crlfDelay: Number.POSITIVE_INFINITY
            });

            for await (const line of lines) {
                if (!line.trim()) {
                    continue;
                }

                await appendNativeEventLine(files.nativeEventsHandle, line);
                const nativeEvent = parseNativeEvent(this.kind, line);
                for (const parsedEvent of parser.parse(nativeEvent)) {
                    usageLimitMessage ??= subscriptionUsageLimitMessage(parsedEvent);
                    const event = stampEvent(parsedEvent, ++sequence, this.kind, parser.sessionId);
                    await appendEvent(files.eventsHandle, event);
                    yield event;
                }
            }

            processExit = await processCompleted;
            if (watchdog.timedOut()) {
                throw new HarnessTimeoutError(this.kind, HarnessTimeoutPhases.RUN, timeoutMs);
            }
            /**
             * A CLI that stopped because its subscription allowance is spent never reaches the end
             * of its protocol, so every later check would report a symptom: a missing final message,
             * an absent structured output. The refusal itself is the finding.
             */
            if (
                usageLimitMessage !== undefined &&
                (processExit.failed || processExit.exitCode !== 0)
            ) {
                throw subscriptionUsageLimitError(this.kind, usageLimitMessage);
            }
            for (const parsedEvent of parser.finish()) {
                const event = stampEvent(parsedEvent, ++sequence, this.kind, parser.sessionId);
                await appendEvent(files.eventsHandle, event);
                tailEvents.push(event);
            }

            if (!parser.sessionId) {
                throw new HarnessProtocolError(
                    this.kind,
                    `${this.kind} CLI completed without reporting a session identifier`
                );
            }

            if (request.responseSchema) {
                if (!parser.hasStructuredOutputCandidate) {
                    throw new HarnessProtocolError(
                        this.kind,
                        `${this.kind} CLI did not return the requested structured output`
                    );
                }

                structuredOutput = parseStructuredOutput(
                    this.kind,
                    parser.structuredOutputCandidate,
                    request.responseSchema
                );
                hasStructuredOutput = true;
                const structuredEvent = {
                    type: HarnessEventTypes.STRUCTURED_OUTPUT,
                    sequence: ++sequence,
                    occurredAt: new Date().toISOString(),
                    harness: this.kind,
                    sessionId: parser.sessionId,
                    value: structuredOutput
                };
                await appendEvent(files.eventsHandle, structuredEvent);
                tailEvents.push(structuredEvent);
            }

            streamCompleted = true;
        } catch (error) {
            semanticError = watchdog.timedOut()
                ? new HarnessTimeoutError(this.kind, HarnessTimeoutPhases.RUN, timeoutMs)
                : error instanceof Error
                  ? error
                  : new Error(String(error));
            internalAbortController.abort(semanticError);
            const diagnostic = {
                type: HarnessEventTypes.DIAGNOSTIC,
                sequence: ++sequence,
                occurredAt: new Date().toISOString(),
                harness: this.kind,
                sessionId: parser.sessionId,
                level: HarnessDiagnosticLevels.ERROR,
                message: semanticError.message
            };
            await appendEvent(files.eventsHandle, diagnostic);
            tailEvents.push(diagnostic);
        } finally {
            if (!streamCompleted && semanticError === undefined) {
                internalAbortController.abort(new Error("Harness event consumer stopped early"));
            }

            if (!processExit && processCompleted) {
                try {
                    processExit = await processCompleted;
                } catch (error) {
                    semanticError ??= watchdog.timedOut()
                        ? new HarnessTimeoutError(this.kind, HarnessTimeoutPhases.RUN, timeoutMs)
                        : error instanceof Error
                          ? error
                          : new Error(String(error));
                }
            }

            processExit ??= {
                exitCode: null,
                signal: null,
                failed: true,
                cancelled: signal?.aborted === true || watchdog.timedOut(),
                stderr: "",
                error: semanticError?.message ?? "Harness process did not start"
            };

            await writeStderrArtifact(files.stderrPath, processExit.stderr);
            await closeRunFiles(files);

            const status = determineRunStatus(
                processExit,
                semanticError,
                streamCompleted,
                signal?.aborted === true,
                watchdog.timedOut()
            );
            const finishedAt = new Date().toISOString();
            const artifacts = await collectArtifacts(files);
            const error = semanticError?.message ?? processExit.error;
            const finishedManifest: FinishedRunManifest = {
                kind: this.kind,
                status,
                cliVersion: preflight.cliVersion,
                authentication: preflight.authentication,
                session,
                sessionId: parser.sessionId,
                ...(hasStructuredOutput ? { structuredOutput } : {}),
                startedAt,
                finishedAt,
                exitCode: processExit.exitCode,
                signal: processExit.signal,
                error,
                timeoutMs,
                command: commandRecord,
                artifacts
            };
            const manifest = await writeFinishedRunManifest(files.manifestPath, finishedManifest);
            const result: HarnessRunResult = {
                ...finishedManifest,
                artifacts: { ...artifacts, manifest }
            };
            completedEvent = {
                type: HarnessEventTypes.RUN_COMPLETED,
                sequence: ++sequence,
                occurredAt: new Date().toISOString(),
                harness: this.kind,
                sessionId: parser.sessionId,
                result
            };
        }

        for (const event of tailEvents) {
            yield event;
        }
        if (completedEvent) {
            yield completedEvent;
        }
        /**
         * Every other failure survives as the manifest's status and message, which is all a caller
         * needs to record the run. A lost capability outlives this run: only the operator can restore
         * it, so it has to reach the scheduler as itself rather than as one more failed-run string.
         */
        if (semanticError instanceof HarnessCapabilityError) {
            throw semanticError;
        }
    }
}
