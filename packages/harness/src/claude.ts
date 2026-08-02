import { z } from "zod";
import {
    type HarnessAuthentication,
    HarnessAuthenticationMethods,
    HarnessDiagnosticLevels,
    HarnessEventTypes,
    HarnessKinds,
    HarnessNativeEventTypes,
    type HarnessRunRequest,
    HarnessToolPhases
} from "#src/contract";
import { HarnessCapabilityError, HarnessProtocolError } from "#src/errors";
import type { HarnessEventParser, ParsedHarnessEvent } from "#src/event-parser";
import type { HarnessCaptureResult } from "#src/process";
import { SubscriptionCliHarness, type SubscriptionHarnessOptions } from "#src/subscription-harness";

export const ClaudePermissionModes = {
    BYPASS_PERMISSIONS: "bypassPermissions"
} as const;

const ClaudeApiProviders = {
    FIRST_PARTY: "firstParty"
} as const;

const ClaudeOutputFormats = {
    STREAM_JSON: "stream-json"
} as const;

const ClaudeSyntheticToolNames = {
    INPUT: "tool_input",
    TOOL: "claude_tool",
    RESULT: "tool_result"
} as const;

const ClaudeNativeEventTypes = {
    SYSTEM: "system",
    ASSISTANT: "assistant",
    USER: "user",
    STREAM_EVENT: "stream_event",
    RESULT: "result"
} as const;

const ClaudeSystemSubtypes = {
    INIT: "init"
} as const;

const ClaudeStreamEventTypes = {
    CONTENT_BLOCK_DELTA: "content_block_delta"
} as const;

const ClaudeContentBlockTypes = {
    TEXT: "text",
    THINKING: "thinking",
    TOOL_USE: "tool_use",
    TOOL_RESULT: "tool_result"
} as const;

const ClaudeDeltaTypes = {
    TEXT: "text_delta",
    THINKING: "thinking_delta",
    INPUT_JSON: "input_json_delta"
} as const;

const ClaudeAuthStatusSchema = z
    .object({
        loggedIn: z.literal(true),
        authMethod: z.literal(HarnessAuthenticationMethods.CLAUDE_AI),
        apiProvider: z.literal(ClaudeApiProviders.FIRST_PARTY),
        subscriptionType: z.string().trim().min(1)
    })
    .passthrough();

const CLAUDE_BINARY = "claude";

export class ClaudeHarness extends SubscriptionCliHarness {
    readonly kind = HarnessKinds.CLAUDE;

    constructor(options: SubscriptionHarnessOptions = {}) {
        super(CLAUDE_BINARY, options);
    }

    protected authenticationCommand(): readonly string[] {
        return ["--setting-sources", "", "auth", "status", "--json"];
    }

    protected parseAuthentication(result: HarnessCaptureResult): HarnessAuthentication {
        try {
            if (result.failed) {
                throw new Error(result.error ?? (result.stderr || result.stdout));
            }
            const auth = ClaudeAuthStatusSchema.parse(JSON.parse(result.stdout));
            return {
                method: HarnessAuthenticationMethods.CLAUDE_AI,
                subscription: auth.subscriptionType
            };
        } catch (error) {
            throw new HarnessCapabilityError(
                this.kind,
                "Claude CLI is not authenticated through a claude.ai subscription",
                {
                    need: "Claude CLI logged in through an active claude.ai subscription",
                    reason: "Console, API-key, Bedrock, Vertex, and Foundry billing are forbidden",
                    provisioningHint: "Run `claude auth login`, choose claude.ai login, and retry"
                },
                { cause: error }
            );
        }
    }

    protected buildCommand(
        request: HarnessRunRequest,
        _responseSchemaPath: string | undefined
    ): { readonly args: readonly string[] } {
        return {
            args: [
                "-p",
                "--output-format",
                ClaudeOutputFormats.STREAM_JSON,
                "--verbose",
                "--include-partial-messages",
                "--dangerously-skip-permissions",
                "--permission-mode",
                ClaudePermissionModes.BYPASS_PERMISSIONS,
                "--setting-sources",
                "",
                ...(request.model === undefined ? [] : ["--model", request.model]),
                ...(request.resumeSessionId === undefined
                    ? []
                    : ["--resume", request.resumeSessionId]),
                ...(request.responseSchema === undefined
                    ? []
                    : ["--json-schema", JSON.stringify(request.responseSchema)])
            ]
        };
    }

    protected createEventParser(request: HarnessRunRequest): HarnessEventParser {
        return new ClaudeEventParser(request.resumeSessionId);
    }
}

class ClaudeEventParser implements HarnessEventParser {
    readonly kind = HarnessKinds.CLAUDE;
    #sessionId: string | null;
    #structuredOutputCandidate: unknown;
    #hasStructuredOutputCandidate = false;
    readonly #resumed: boolean;

    constructor(resumeSessionId: string | undefined) {
        this.#sessionId = resumeSessionId ?? null;
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
        this.readSession(event);

        switch (nativeType) {
            case ClaudeNativeEventTypes.SYSTEM:
                if (readString(event.subtype) === ClaudeSystemSubtypes.INIT) {
                    return [
                        {
                            type: HarnessEventTypes.SESSION_STARTED,
                            resumed: this.#resumed
                        }
                    ];
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
            case ClaudeDeltaTypes.INPUT_JSON:
                return [
                    {
                        type: HarnessEventTypes.TOOL,
                        phase: HarnessToolPhases.UPDATED,
                        toolName: ClaudeSyntheticToolNames.INPUT,
                        callId: null,
                        payload: delta
                    }
                ];
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

    private readSession(event: Readonly<Record<string, unknown>>): void {
        const sessionId = readString(event.session_id);
        if (!sessionId) {
            return;
        }
        if (this.#sessionId && this.#sessionId !== sessionId) {
            throw new HarnessProtocolError(
                this.kind,
                `Claude resumed session ${this.#sessionId} but reported ${sessionId}`
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
