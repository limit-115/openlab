import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { type FileHandle, mkdir, open, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import writeFileAtomic from "write-file-atomic";
import { z } from "zod";
import {
    type AgentHarness,
    type HarnessArtifact,
    type HarnessAuthentication,
    type HarnessCommandRecord,
    type HarnessCompletedEvent,
    HarnessDiagnosticLevels,
    type HarnessEvent,
    HarnessEventTypes,
    HarnessInputSources,
    type HarnessKind,
    type HarnessPreflight,
    type HarnessRunRequest,
    type HarnessRunResult,
    type HarnessRunStatus,
    HarnessRunStatuses,
    HarnessTimeoutMilliseconds
} from "#src/contract";
import { removedHarnessEnvironmentVariables, sanitizeHarnessEnvironment } from "#src/environment";
import {
    HarnessAbortedError,
    HarnessCapabilityError,
    HarnessProtocolError,
    HarnessRequestError,
    HarnessTimeoutError,
    HarnessTimeoutPhases
} from "#src/errors";
import type { HarnessEventParser, ParsedHarnessEvent } from "#src/event-parser";
import {
    ExecaHarnessProcessRunner,
    type HarnessCaptureResult,
    type HarnessProcessExit,
    type HarnessProcessRunner
} from "#src/process";
import { validateStructuredOutput } from "#src/structured-output";

const NativeEventSchema = z.record(z.string(), z.unknown());
const PROMPT_FILE = "prompt.txt";
const RESPONSE_SCHEMA_FILE = "response-schema.json";
const NATIVE_EVENTS_FILE = "native-events.jsonl";
const EVENTS_FILE = "events.jsonl";
const STDERR_FILE = "stderr.log";
const MANIFEST_FILE = "harness-run.json";

export interface SubscriptionHarnessOptions {
    readonly binary?: string;
    readonly runner?: HarnessProcessRunner;
    readonly environment?: Readonly<NodeJS.ProcessEnv>;
    readonly preflightTimeoutMs?: number;
}

interface HarnessCommand {
    readonly args: readonly string[];
}

interface RunFiles {
    readonly artifactDirectory: string;
    readonly prompt: HarnessArtifact;
    readonly responseSchema?: HarnessArtifact;
    readonly nativeEventsPath: string;
    readonly eventsPath: string;
    readonly stderrPath: string;
    readonly manifestPath: string;
    readonly nativeEventsHandle: FileHandle;
    readonly eventsHandle: FileHandle;
}

interface NonManifestArtifacts {
    readonly prompt: HarnessArtifact;
    readonly nativeEvents: HarnessArtifact;
    readonly events: HarnessArtifact;
    readonly stderr: HarnessArtifact;
    readonly responseSchema?: HarnessArtifact;
}

interface WatchdogSignal {
    readonly signal: AbortSignal;
    timedOut(): boolean;
}

const MAXIMUM_TIMEOUT_MILLISECONDS = 2_147_483_647;

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
    protected abstract parseAuthentication(result: HarnessCaptureResult): HarnessAuthentication;
    protected abstract buildCommand(
        request: HarnessRunRequest,
        responseSchemaPath: string | undefined
    ): HarnessCommand;
    protected abstract createEventParser(request: HarnessRunRequest): HarnessEventParser;

    async preflight(signal?: AbortSignal): Promise<HarnessPreflight> {
        return this.preflightInDirectory(process.cwd(), signal);
    }

    private async preflightInDirectory(
        cwd: string,
        signal?: AbortSignal
    ): Promise<HarnessPreflight> {
        this.throwIfAborted(signal);
        const watchdog = createWatchdogSignal(this.#preflightTimeoutMs, [signal]);
        const environment = sanitizeHarnessEnvironment(this.#sourceEnvironment);
        let versionResult: HarnessCaptureResult;
        let authenticationResult: HarnessCaptureResult;

        try {
            versionResult = await this.#runner.capture({
                file: this.#binary,
                args: ["--version"],
                cwd,
                environment,
                signal: watchdog.signal
            });
            this.throwIfPreflightStopped(watchdog, signal, versionResult);
            authenticationResult = await this.#runner.capture({
                file: this.#binary,
                args: this.authenticationCommand(),
                cwd,
                environment,
                signal: watchdog.signal
            });
            this.throwIfPreflightStopped(watchdog, signal, authenticationResult);
        } catch (error) {
            if (error instanceof HarnessTimeoutError || error instanceof HarnessAbortedError) {
                throw error;
            }
            if (watchdog.timedOut()) {
                throw new HarnessTimeoutError(
                    this.kind,
                    HarnessTimeoutPhases.PREFLIGHT,
                    this.#preflightTimeoutMs
                );
            }
            if (signal?.aborted) {
                throw new HarnessAbortedError(this.kind, { cause: signal.reason ?? error });
            }

            throw this.unavailableCapability(error);
        }

        if (versionResult.failed || !versionResult.stdout.trim()) {
            throw this.unavailableCapability(
                new Error(versionResult.error ?? (versionResult.stderr || "version command failed"))
            );
        }

        return {
            kind: this.kind,
            cliVersion: versionResult.stdout.trim(),
            authentication: this.parseAuthentication(authenticationResult)
        };
    }

    async *run(request: HarnessRunRequest, signal?: AbortSignal): AsyncIterable<HarnessEvent> {
        this.validateRequest(request);
        const timeoutMs = request.timeoutMs ?? HarnessTimeoutMilliseconds.RUN;
        const preflight = await this.preflightInDirectory(resolve(request.cwd), signal);
        const environment = sanitizeHarnessEnvironment(this.#sourceEnvironment);
        const removedEnvironmentVariables = removedHarnessEnvironmentVariables(
            this.#sourceEnvironment
        );
        const files = await createRunFiles(this.kind, request);
        const command = this.buildCommand(request, files.responseSchema?.path);
        const commandRecord: HarnessCommandRecord = {
            file: this.#binary,
            args: [...command.args],
            cwd: resolve(request.cwd),
            stdin: HarnessInputSources.PROMPT,
            removedEnvironmentVariables
        };
        const startedAt = new Date().toISOString();
        await writeFileAtomic(
            files.manifestPath,
            `${JSON.stringify(
                {
                    schemaVersion: 1,
                    status: HarnessRunStatuses.RUNNING,
                    kind: this.kind,
                    cliVersion: preflight.cliVersion,
                    authentication: preflight.authentication,
                    command: commandRecord,
                    startedAt,
                    timeoutMs,
                    prompt: files.prompt,
                    ...(files.responseSchema === undefined
                        ? {}
                        : { responseSchema: files.responseSchema })
                },
                null,
                4
            )}\n`,
            { encoding: "utf8", mode: 0o600 }
        );

        const parser = this.createEventParser(request);
        const internalAbortController = new AbortController();
        const watchdog = createWatchdogSignal(timeoutMs, [signal, internalAbortController.signal]);
        let processExit: HarnessProcessExit | undefined;
        let processCompleted: Promise<HarnessProcessExit> | undefined;
        let sequence = 0;
        let streamCompleted = false;
        let semanticError: Error | undefined;
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
                input: request.prompt,
                signal: watchdog.signal
            });
            processCompleted = child.completed;
            const lines = createInterface({
                input: child.stdout,
                crlfDelay: Number.POSITIVE_INFINITY
            });

            for await (const line of lines) {
                if (!line.trim()) {
                    continue;
                }

                await files.nativeEventsHandle.appendFile(`${line}\n`, "utf8");
                const nativeEvent = parseNativeEvent(this.kind, line);
                for (const parsedEvent of parser.parse(nativeEvent)) {
                    const event = stampEvent(parsedEvent, ++sequence, this.kind, parser.sessionId);
                    await appendEvent(files.eventsHandle, event);
                    yield event;
                }
            }

            processExit = await processCompleted;
            if (watchdog.timedOut()) {
                throw new HarnessTimeoutError(this.kind, HarnessTimeoutPhases.RUN, timeoutMs);
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

                structuredOutput = validateStructuredOutput(
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

            await writeFile(files.stderrPath, processExit.stderr, {
                encoding: "utf8",
                flag: "wx",
                mode: 0o600
            });
            await Promise.all([files.nativeEventsHandle.close(), files.eventsHandle.close()]);

            const status = determineStatus(
                processExit,
                semanticError,
                streamCompleted,
                signal?.aborted === true,
                watchdog.timedOut()
            );
            const finishedAt = new Date().toISOString();
            const artifacts = await collectArtifacts(files);
            const error = semanticError?.message ?? processExit.error;
            const persistedResult = {
                schemaVersion: 1,
                kind: this.kind,
                status,
                cliVersion: preflight.cliVersion,
                authentication: preflight.authentication,
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
            await writeFileAtomic(
                files.manifestPath,
                `${JSON.stringify(persistedResult, null, 4)}\n`,
                { encoding: "utf8", mode: 0o600 }
            );
            const manifest = await hashArtifact(files.manifestPath);
            const result: HarnessRunResult = {
                kind: this.kind,
                status,
                cliVersion: preflight.cliVersion,
                authentication: preflight.authentication,
                sessionId: parser.sessionId,
                ...(hasStructuredOutput ? { structuredOutput } : {}),
                startedAt,
                finishedAt,
                exitCode: processExit.exitCode,
                signal: processExit.signal,
                error,
                timeoutMs,
                command: commandRecord,
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
    }

    private validateRequest(request: HarnessRunRequest): void {
        if (!request.prompt.trim()) {
            throw new HarnessRequestError(this.kind, "Harness prompt cannot be empty");
        }
        if (!request.cwd.trim()) {
            throw new HarnessRequestError(this.kind, "Harness working directory cannot be empty");
        }
        if (!request.artifactDirectory.trim()) {
            throw new HarnessRequestError(this.kind, "Harness artifact directory cannot be empty");
        }
        if (request.model !== undefined && !request.model.trim()) {
            throw new HarnessRequestError(this.kind, "Harness model cannot be empty");
        }
        if (request.resumeSessionId !== undefined && !request.resumeSessionId.trim()) {
            throw new HarnessRequestError(this.kind, "Resume session id cannot be empty");
        }
        const timeoutMs = request.timeoutMs ?? HarnessTimeoutMilliseconds.RUN;
        try {
            validateTimeoutMilliseconds(timeoutMs, "Run timeout");
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new HarnessRequestError(this.kind, message, { cause: error });
        }
    }

    private throwIfAborted(signal?: AbortSignal, result?: HarnessCaptureResult): void {
        if (signal?.aborted || result?.cancelled) {
            throw new HarnessAbortedError(this.kind, { cause: signal?.reason });
        }
    }

    private throwIfPreflightStopped(
        watchdog: WatchdogSignal,
        signal: AbortSignal | undefined,
        result: HarnessCaptureResult
    ): void {
        if (watchdog.timedOut()) {
            throw new HarnessTimeoutError(
                this.kind,
                HarnessTimeoutPhases.PREFLIGHT,
                this.#preflightTimeoutMs
            );
        }
        this.throwIfAborted(signal, result);
    }

    private unavailableCapability(cause: unknown): HarnessCapabilityError {
        return new HarnessCapabilityError(
            this.kind,
            `${this.kind} CLI is unavailable or cannot report subscription authentication`,
            {
                need: `${this.kind} CLI with an active product subscription login`,
                reason: `The ${this.kind} agent cannot run without proven subscription authentication`,
                provisioningHint: `Install ${this.kind}, log in interactively with the product subscription, then retry`
            },
            { cause }
        );
    }
}

async function createRunFiles(kind: HarnessKind, request: HarnessRunRequest): Promise<RunFiles> {
    const artifactDirectory = resolve(request.artifactDirectory);
    await mkdir(dirname(artifactDirectory), { recursive: true });
    try {
        await mkdir(artifactDirectory);
    } catch (error) {
        throw new HarnessRequestError(
            kind,
            `Harness artifact directory must not already exist: ${artifactDirectory}`,
            { cause: error }
        );
    }

    const promptPath = resolve(artifactDirectory, PROMPT_FILE);
    await writeFile(promptPath, request.prompt, { encoding: "utf8", flag: "wx", mode: 0o600 });
    const prompt = await hashArtifact(promptPath);
    let responseSchema: HarnessArtifact | undefined;
    if (request.responseSchema) {
        const responseSchemaPath = resolve(artifactDirectory, RESPONSE_SCHEMA_FILE);
        await writeFile(
            responseSchemaPath,
            `${JSON.stringify(request.responseSchema, null, 4)}\n`,
            {
                encoding: "utf8",
                flag: "wx",
                mode: 0o600
            }
        );
        responseSchema = await hashArtifact(responseSchemaPath);
    }

    const nativeEventsPath = resolve(artifactDirectory, NATIVE_EVENTS_FILE);
    const eventsPath = resolve(artifactDirectory, EVENTS_FILE);
    const stderrPath = resolve(artifactDirectory, STDERR_FILE);
    const manifestPath = resolve(artifactDirectory, MANIFEST_FILE);
    const [nativeEventsHandle, eventsHandle] = await Promise.all([
        open(nativeEventsPath, "wx", 0o600),
        open(eventsPath, "wx", 0o600)
    ]);

    return {
        artifactDirectory,
        prompt,
        ...(responseSchema === undefined ? {} : { responseSchema }),
        nativeEventsPath,
        eventsPath,
        stderrPath,
        manifestPath,
        nativeEventsHandle,
        eventsHandle
    };
}

function parseNativeEvent(kind: HarnessKind, line: string): Readonly<Record<string, unknown>> {
    try {
        return NativeEventSchema.parse(JSON.parse(line));
    } catch (error) {
        throw new HarnessProtocolError(kind, `${kind} emitted invalid JSONL: ${line}`, {
            cause: error
        });
    }
}

function stampEvent(
    event: ParsedHarnessEvent,
    sequence: number,
    harness: HarnessKind,
    sessionId: string | null
): Exclude<HarnessEvent, HarnessCompletedEvent> {
    const base = {
        sequence,
        occurredAt: new Date().toISOString(),
        harness,
        sessionId
    };

    switch (event.type) {
        case HarnessEventTypes.SESSION_STARTED:
            return { ...base, ...event };
        case HarnessEventTypes.ASSISTANT_DELTA:
        case HarnessEventTypes.ASSISTANT_COMPLETED:
        case HarnessEventTypes.REASONING_DELTA:
        case HarnessEventTypes.REASONING_COMPLETED:
            return { ...base, ...event };
        case HarnessEventTypes.TOOL:
            return { ...base, ...event };
        case HarnessEventTypes.USAGE:
            return { ...base, ...event };
        case HarnessEventTypes.DIAGNOSTIC:
            return { ...base, ...event };
        case HarnessEventTypes.NATIVE:
            return { ...base, ...event };
    }
}

async function appendEvent(handle: FileHandle, event: HarnessEvent): Promise<void> {
    await handle.appendFile(`${JSON.stringify(event)}\n`, "utf8");
}

function determineStatus(
    processExit: HarnessProcessExit,
    semanticError: Error | undefined,
    streamCompleted: boolean,
    cancelledByCaller: boolean,
    timedOut: boolean
): HarnessRunStatus {
    if (timedOut) {
        return HarnessRunStatuses.TIMED_OUT;
    }
    if (cancelledByCaller || (!streamCompleted && semanticError === undefined)) {
        return HarnessRunStatuses.CANCELLED;
    }
    if (semanticError) {
        return HarnessRunStatuses.FAILED;
    }
    if (processExit.cancelled) {
        return HarnessRunStatuses.CANCELLED;
    }
    if (processExit.failed || processExit.exitCode !== 0) {
        return HarnessRunStatuses.FAILED;
    }
    return HarnessRunStatuses.SUCCEEDED;
}

function createWatchdogSignal(
    timeoutMs: number,
    candidates: readonly (AbortSignal | undefined)[]
): WatchdogSignal {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signals = [
        ...candidates.filter((candidate): candidate is AbortSignal => candidate !== undefined),
        timeoutSignal
    ];
    const signal = signals.length === 1 ? timeoutSignal : AbortSignal.any(signals);
    return {
        signal,
        timedOut: () => timeoutSignal.aborted && signal.reason === timeoutSignal.reason
    };
}

function validateTimeoutMilliseconds(timeoutMs: number, label: string): void {
    if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 1 ||
        timeoutMs > MAXIMUM_TIMEOUT_MILLISECONDS
    ) {
        throw new RangeError(
            `${label} must be an integer between 1 and ${MAXIMUM_TIMEOUT_MILLISECONDS} ms`
        );
    }
}

async function collectArtifacts(files: RunFiles): Promise<NonManifestArtifacts> {
    const [nativeEvents, events, stderr] = await Promise.all([
        hashArtifact(files.nativeEventsPath),
        hashArtifact(files.eventsPath),
        hashArtifact(files.stderrPath)
    ]);
    return {
        prompt: files.prompt,
        nativeEvents,
        events,
        stderr,
        ...(files.responseSchema === undefined ? {} : { responseSchema: files.responseSchema })
    };
}

async function hashArtifact(path: string): Promise<HarnessArtifact> {
    const hash = createHash("sha256");
    let bytes = 0;
    for await (const chunk of createReadStream(path)) {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += data.byteLength;
        hash.update(data);
    }
    return { path, bytes, sha256: hash.digest("hex") };
}
