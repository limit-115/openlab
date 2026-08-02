import {
    type HarnessAuthentication,
    HarnessAuthenticationMethods,
    HarnessDiagnosticLevels,
    HarnessEventTypes,
    type HarnessKind,
    HarnessKinds,
    HarnessNativeEventTypes,
    type HarnessRunRequest,
    HarnessToolPhases
} from "#src/contract";
import { HarnessCapabilityError, HarnessProtocolError } from "#src/errors";
import type { HarnessEventParser, ParsedHarnessEvent } from "#src/event-parser";
import type { HarnessCaptureResult } from "#src/process";
import { SubscriptionCliHarness, type SubscriptionHarnessOptions } from "#src/subscription-harness";

export const CodexPermissionModes = {
    UNRESTRICTED: "unrestricted"
} as const;

const CodexPermissionArguments = {
    [CodexPermissionModes.UNRESTRICTED]: ["--dangerously-bypass-approvals-and-sandbox"]
} as const;

const CodexNativeEventTypes = {
    THREAD_STARTED: "thread.started",
    TURN_STARTED: "turn.started",
    TURN_COMPLETED: "turn.completed",
    TURN_FAILED: "turn.failed",
    ITEM_STARTED: "item.started",
    ITEM_UPDATED: "item.updated",
    ITEM_COMPLETED: "item.completed",
    ERROR: "error"
} as const;

const CodexItemTypes = {
    AGENT_MESSAGE: "agent_message",
    REASONING: "reasoning"
} as const;

const CodexLoginMarkers = {
    CHATGPT: "Logged in using ChatGPT"
} as const;

const CodexSyntheticToolNames = {
    ITEM: "codex_item"
} as const;

const CodexColorModes = {
    NEVER: "never"
} as const;

const CODEX_BINARY = "codex";

export class CodexHarness extends SubscriptionCliHarness {
    readonly kind = HarnessKinds.CODEX;

    constructor(options: SubscriptionHarnessOptions = {}) {
        super(CODEX_BINARY, options);
    }

    protected authenticationCommand(): readonly string[] {
        return ["login", "status"];
    }

    protected parseAuthentication(result: HarnessCaptureResult): HarnessAuthentication {
        const statusOutput = `${result.stdout}\n${result.stderr}`.trim();
        if (result.failed || !statusOutput.includes(CodexLoginMarkers.CHATGPT)) {
            throw new HarnessCapabilityError(
                this.kind,
                "Codex CLI is not authenticated through ChatGPT",
                {
                    need: "Codex CLI logged in through an active ChatGPT subscription",
                    reason: "API-key and usage-billed Codex authentication are forbidden",
                    provisioningHint: "Run `codex login`, choose ChatGPT login, and retry"
                },
                { cause: new Error(result.error ?? statusOutput) }
            );
        }

        return {
            method: HarnessAuthenticationMethods.CHATGPT,
            subscription: null
        };
    }

    protected buildCommand(
        request: HarnessRunRequest,
        responseSchemaPath: string | undefined
    ): { readonly args: readonly string[] } {
        const sharedArguments = [
            "--json",
            "--ignore-user-config",
            "--skip-git-repo-check",
            ...CodexPermissionArguments[CodexPermissionModes.UNRESTRICTED],
            ...(request.model === undefined ? [] : ["--model", request.model]),
            ...(responseSchemaPath === undefined ? [] : ["--output-schema", responseSchemaPath])
        ];

        if (request.resumeSessionId) {
            return {
                args: ["exec", "resume", ...sharedArguments, request.resumeSessionId, "-"]
            };
        }

        return {
            args: ["exec", "--color", CodexColorModes.NEVER, ...sharedArguments, "-"]
        };
    }

    protected createEventParser(request: HarnessRunRequest): HarnessEventParser {
        return new CodexEventParser(request.resumeSessionId, request.responseSchema !== undefined);
    }
}

class CodexEventParser implements HarnessEventParser {
    readonly kind = HarnessKinds.CODEX;
    #sessionId: string | null;
    #lastAssistantText: string | undefined;
    #structuredOutputCandidate: unknown;
    #hasStructuredOutputCandidate = false;
    readonly #structuredOutputRequested: boolean;
    readonly #resumed: boolean;

    constructor(resumeSessionId: string | undefined, structuredOutputRequested: boolean) {
        this.#sessionId = resumeSessionId ?? null;
        this.#structuredOutputRequested = structuredOutputRequested;
        this.#resumed = resumeSessionId !== undefined;
    }

    get sessionId(): string | null {
        return this.#sessionId;
    }

    get structuredOutputCandidate(): unknown {
        return this.#structuredOutputCandidate;
    }

    get hasStructuredOutputCandidate(): boolean {
        return this.#hasStructuredOutputCandidate;
    }

    parse(event: Readonly<Record<string, unknown>>): readonly ParsedHarnessEvent[] {
        const nativeType = readString(event.type);
        switch (nativeType) {
            case CodexNativeEventTypes.THREAD_STARTED:
                this.setSession(readRequiredString(this.kind, event, "thread_id"));
                return [
                    {
                        type: HarnessEventTypes.SESSION_STARTED,
                        resumed: this.#resumed
                    }
                ];
            case CodexNativeEventTypes.ITEM_STARTED:
                return this.parseItem(event, HarnessToolPhases.STARTED);
            case CodexNativeEventTypes.ITEM_UPDATED:
                return this.parseItem(event, HarnessToolPhases.UPDATED);
            case CodexNativeEventTypes.ITEM_COMPLETED:
                return this.parseItem(event, HarnessToolPhases.COMPLETED);
            case CodexNativeEventTypes.TURN_COMPLETED:
                return this.parseUsage(event);
            case CodexNativeEventTypes.TURN_FAILED:
            case CodexNativeEventTypes.ERROR:
                return [
                    {
                        type: HarnessEventTypes.DIAGNOSTIC,
                        level: HarnessDiagnosticLevels.ERROR,
                        message: readErrorMessage(event)
                    }
                ];
            case CodexNativeEventTypes.TURN_STARTED:
                return [];
            default:
                return [
                    {
                        type: HarnessEventTypes.NATIVE,
                        nativeType: nativeType ?? HarnessNativeEventTypes.UNKNOWN,
                        payload: event
                    }
                ];
        }
    }

    finish(): readonly ParsedHarnessEvent[] {
        if (this.#structuredOutputRequested) {
            if (this.#lastAssistantText === undefined) {
                throw new HarnessProtocolError(
                    this.kind,
                    "Codex did not emit a final agent message for structured output"
                );
            }

            try {
                this.#structuredOutputCandidate = JSON.parse(this.#lastAssistantText);
                this.#hasStructuredOutputCandidate = true;
            } catch (error) {
                throw new HarnessProtocolError(
                    this.kind,
                    "Codex final agent message is not valid structured JSON",
                    { cause: error }
                );
            }
        }

        return [];
    }

    private parseItem(
        event: Readonly<Record<string, unknown>>,
        phase: (typeof HarnessToolPhases)[keyof typeof HarnessToolPhases]
    ): readonly ParsedHarnessEvent[] {
        const item = readRecord(event.item);
        if (!item) {
            throw new HarnessProtocolError(
                this.kind,
                "Codex item event is missing its item payload"
            );
        }

        const itemType = readString(item.type);
        if (itemType === CodexItemTypes.AGENT_MESSAGE) {
            if (phase !== HarnessToolPhases.COMPLETED) {
                return [];
            }
            const text = readRequiredString(this.kind, item, "text");
            this.#lastAssistantText = text;
            return [{ type: HarnessEventTypes.ASSISTANT_COMPLETED, text }];
        }

        if (itemType === CodexItemTypes.REASONING) {
            if (phase !== HarnessToolPhases.COMPLETED) {
                return [];
            }
            const text = readString(item.text);
            return text ? [{ type: HarnessEventTypes.REASONING_COMPLETED, text }] : [];
        }

        return [
            {
                type: HarnessEventTypes.TOOL,
                phase,
                toolName: itemType ?? CodexSyntheticToolNames.ITEM,
                callId: readString(item.id) ?? null,
                payload: item
            }
        ];
    }

    private parseUsage(event: Readonly<Record<string, unknown>>): readonly ParsedHarnessEvent[] {
        const usage = readRecord(event.usage);
        if (!usage) {
            return [];
        }

        return [
            {
                type: HarnessEventTypes.USAGE,
                inputTokens: readNumber(usage.input_tokens),
                outputTokens: readNumber(usage.output_tokens),
                cachedInputTokens: readNumber(usage.cached_input_tokens)
            }
        ];
    }

    private setSession(sessionId: string): void {
        if (this.#sessionId && this.#sessionId !== sessionId) {
            throw new HarnessProtocolError(
                this.kind,
                `Codex resumed session ${this.#sessionId} but reported ${sessionId}`
            );
        }
        this.#sessionId = sessionId;
    }
}

function readRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Readonly<Record<string, unknown>>)
        : undefined;
}

function readString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}

function readNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readRequiredString(
    kind: HarnessKind,
    record: Readonly<Record<string, unknown>>,
    key: string
): string {
    const value = readString(record[key]);
    if (value === undefined) {
        throw new HarnessProtocolError(kind, `Codex event field ${key} must be a string`);
    }
    return value;
}

function readErrorMessage(event: Readonly<Record<string, unknown>>): string {
    const direct = readString(event.message);
    if (direct) {
        return direct;
    }
    const error = readRecord(event.error);
    return (error && readString(error.message)) || "Codex reported an unknown error";
}
