import { type HarnessKind, HarnessKinds } from "#src/agent-harness/agent-harness.const";
import {
    HarnessDiagnosticLevels,
    HarnessEventTypes,
    HarnessNativeEventTypes,
    type HarnessToolPhase,
    HarnessToolPhases
} from "#src/agent-harness/harness-event.const";
import type {
    HarnessEventParser,
    ParsedHarnessEvent
} from "#src/agent-harness/harness-event-parser.types";
import { HarnessProtocolError } from "#src/cli-execution/harness-error";
import {
    CodexItemTypes,
    CodexNativeEventTypes,
    CodexSyntheticToolNames
} from "#src/codex-cli/codex-cli.const";

export class CodexEventParser implements HarnessEventParser {
    readonly kind = HarnessKinds.CODEX;
    #sessionId: string | null = null;
    #lastAssistantText: string | undefined;
    #structuredOutputCandidate: unknown;
    #hasStructuredOutputCandidate = false;
    readonly #structuredOutputRequested: boolean;

    constructor(structuredOutputRequested: boolean) {
        this.#structuredOutputRequested = structuredOutputRequested;
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
                return [{ type: HarnessEventTypes.SESSION_STARTED }];
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
        phase: HarnessToolPhase
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

    /** Filing a second thread's events under the first would put one run's work in another's record. */
    private setSession(sessionId: string): void {
        if (this.#sessionId && this.#sessionId !== sessionId) {
            throw new HarnessProtocolError(
                this.kind,
                `Codex reported thread ${sessionId} on a stream that opened as ${this.#sessionId}`
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
