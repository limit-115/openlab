import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import {
    HarnessDiagnosticLevels,
    HarnessEventTypes,
    HarnessNativeEventTypes,
    HarnessToolPhases
} from "#src/agent-harness/harness-event.const";
import type {
    HarnessEventParser,
    ParsedHarnessEvent
} from "#src/agent-harness/harness-event-parser.types";
import {
    ClaudeContentBlockTypes,
    ClaudeDeltaTypes,
    ClaudeNativeEventTypes,
    ClaudeStreamEventTypes,
    ClaudeSyntheticToolNames,
    ClaudeSystemSubtypes
} from "#src/claude-cli/claude-cli.const";
import { HarnessProtocolError } from "#src/cli-execution/harness-error";

export class ClaudeEventParser implements HarnessEventParser {
    readonly kind = HarnessKinds.CLAUDE;
    #sessionId: string | null = null;
    #structuredOutputCandidate: unknown;
    #hasStructuredOutputCandidate = false;

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
        this.readSession(event);

        switch (nativeType) {
            case ClaudeNativeEventTypes.SYSTEM:
                if (readString(event.subtype) === ClaudeSystemSubtypes.INIT) {
                    return [{ type: HarnessEventTypes.SESSION_STARTED }];
                }
                break;
            case ClaudeNativeEventTypes.STREAM_EVENT:
                return this.parseStreamEvent(event);
            case ClaudeNativeEventTypes.ASSISTANT:
                return this.parseMessage(event, false);
            case ClaudeNativeEventTypes.USER:
                return this.parseMessage(event, true);
            case ClaudeNativeEventTypes.RESULT:
                return this.parseResult(event);
        }

        return [
            {
                type: HarnessEventTypes.NATIVE,
                nativeType: nativeType ?? HarnessNativeEventTypes.UNKNOWN,
                payload: event
            }
        ];
    }

    finish(): readonly ParsedHarnessEvent[] {
        return [];
    }

    private parseStreamEvent(
        event: Readonly<Record<string, unknown>>
    ): readonly ParsedHarnessEvent[] {
        const streamEvent = readRecord(event.event);
        if (
            !streamEvent ||
            readString(streamEvent.type) !== ClaudeStreamEventTypes.CONTENT_BLOCK_DELTA
        ) {
            return [];
        }
        const delta = readRecord(streamEvent.delta);
        const deltaType = delta && readString(delta.type);

        switch (deltaType) {
            case ClaudeDeltaTypes.TEXT: {
                const text = readString(delta?.text);
                return text ? [{ type: HarnessEventTypes.ASSISTANT_DELTA, text }] : [];
            }
            case ClaudeDeltaTypes.THINKING: {
                const text = readString(delta?.thinking);
                return text ? [{ type: HarnessEventTypes.REASONING_DELTA, text }] : [];
            }
            /**
             * A tool's arguments are streamed as dozens of partial-JSON fragments that name
             * neither the tool nor what it acts on, and there is nothing to attach them to: the
             * delta carries no call id. The tool_use block that closes the message carries the
             * whole call, so the fragments are dropped rather than reported as calls of their own.
             */
            case ClaudeDeltaTypes.INPUT_JSON:
                return [];
            default:
                return [];
        }
    }

    private parseMessage(
        event: Readonly<Record<string, unknown>>,
        isUser: boolean
    ): readonly ParsedHarnessEvent[] {
        const message = readRecord(event.message);
        const content = message && Array.isArray(message.content) ? message.content : [];
        const events: ParsedHarnessEvent[] = [];

        for (const candidate of content) {
            const block = readRecord(candidate);
            if (!block) {
                continue;
            }
            const blockType = readString(block.type);
            if (!isUser && blockType === ClaudeContentBlockTypes.TEXT) {
                const text = readString(block.text);
                if (text) {
                    events.push({ type: HarnessEventTypes.ASSISTANT_COMPLETED, text });
                }
            } else if (!isUser && blockType === ClaudeContentBlockTypes.THINKING) {
                const text = readString(block.thinking);
                if (text) {
                    events.push({ type: HarnessEventTypes.REASONING_COMPLETED, text });
                }
            } else if (!isUser && blockType === ClaudeContentBlockTypes.TOOL_USE) {
                events.push({
                    type: HarnessEventTypes.TOOL,
                    phase: HarnessToolPhases.STARTED,
                    toolName: readString(block.name) ?? ClaudeSyntheticToolNames.TOOL,
                    callId: readString(block.id) ?? null,
                    payload: block
                });
            } else if (isUser && blockType === ClaudeContentBlockTypes.TOOL_RESULT) {
                events.push({
                    type: HarnessEventTypes.TOOL,
                    phase: HarnessToolPhases.COMPLETED,
                    toolName: ClaudeSyntheticToolNames.RESULT,
                    callId: readString(block.tool_use_id) ?? null,
                    payload: block
                });
            }
        }

        return events;
    }

    private parseResult(event: Readonly<Record<string, unknown>>): readonly ParsedHarnessEvent[] {
        const events: ParsedHarnessEvent[] = [];
        if (Object.hasOwn(event, "structured_output")) {
            this.#structuredOutputCandidate = event.structured_output;
            this.#hasStructuredOutputCandidate = true;
        }

        const usage = readRecord(event.usage);
        if (usage) {
            events.push({
                type: HarnessEventTypes.USAGE,
                inputTokens: readNumber(usage.input_tokens),
                outputTokens: readNumber(usage.output_tokens),
                cachedInputTokens: readNumber(usage.cache_read_input_tokens)
            });
        }

        if (event.is_error === true) {
            events.push({
                type: HarnessEventTypes.DIAGNOSTIC,
                level: HarnessDiagnosticLevels.ERROR,
                message: readString(event.result) ?? "Claude reported an unknown error"
            });
        }

        return events;
    }

    /** Filing a second session's events under the first would put one run's work in another's record. */
    private readSession(event: Readonly<Record<string, unknown>>): void {
        const sessionId = readString(event.session_id);
        if (!sessionId) {
            return;
        }
        if (this.#sessionId && this.#sessionId !== sessionId) {
            throw new HarnessProtocolError(
                this.kind,
                `Claude reported session ${sessionId} on a stream that opened as ${this.#sessionId}`
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
