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
import { HarnessProtocolError } from "#src/cli-execution/harness-error";
import {
    MuseModels,
    MusePayloadTypes,
    MuseStreamKinds,
    MuseSyntheticToolNames,
    MuseTaskKindPrefixes
} from "#src/muse-cli/muse-cli.const";
import { museStructuredCandidate } from "#src/muse-cli/muse-structured-response";

/**
 * Reads the event log `muse exec --json` writes to stdout. Every line is one envelope on one of three
 * streams, and the session stream's id is the id the run is known by afterwards.
 *
 * No usage event is produced, because Muse Code emits none: the stdout stream carries no token counts,
 * no cost and no rate-limit state anywhere in it. That is a gap in what the lab can show about a Muse
 * run rather than one this parser can close, and the harness setup card says so where an operator
 * chooses the harness.
 */
export class MuseEventParser implements HarnessEventParser {
    readonly kind = HarnessKinds.MUSE;
    readonly #structured: boolean;
    #sessionId: string | null = null;
    #structuredOutputCandidate: unknown;
    #hasStructuredOutputCandidate = false;

    constructor(structured: boolean) {
        this.#structured = structured;
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
        this.readSession(event);
        const payload = readRecord(event.payload) ?? {};

        switch (readString(event.payload_type)) {
            case MusePayloadTypes.RUN_LIFECYCLE_STARTED:
                return [{ type: HarnessEventTypes.SESSION_STARTED, resumed: false }];
            case MusePayloadTypes.RUN_MODEL_CONFIGURED:
                return contributorTierWarning(readString(payload.model_id));
            case MusePayloadTypes.RUN_OUTPUT_DELTA: {
                const text = readString(payload.text);
                return text ? [{ type: HarnessEventTypes.ASSISTANT_DELTA, text }] : [];
            }
            case MusePayloadTypes.RUN_TERMINAL_COMPLETED:
                return this.parseTerminalCompleted(readString(payload.text) ?? "");
            case MusePayloadTypes.RUN_TERMINAL_FAILED:
                return [
                    {
                        type: HarnessEventTypes.DIAGNOSTIC,
                        level: HarnessDiagnosticLevels.ERROR,
                        message: readString(payload.reason) ?? "Muse Code ended the run as failed"
                    }
                ];
            case MusePayloadTypes.TOOL_RESULT:
                return [
                    {
                        type: HarnessEventTypes.TOOL,
                        phase: HarnessToolPhases.COMPLETED,
                        toolName:
                            readString(readRecord(payload.correlation_facts)?.tool_name) ??
                            MuseSyntheticToolNames.RESULT,
                        callId: readString(payload.call_id) ?? null,
                        payload
                    }
                ];
            case MusePayloadTypes.TASK_LIFECYCLE_PROPOSED:
                return proposedToolCall(readRecord(payload.event));
            case MusePayloadTypes.TASK_LIFECYCLE_FAILED:
                return [
                    {
                        type: HarnessEventTypes.DIAGNOSTIC,
                        level: HarnessDiagnosticLevels.ERROR,
                        message:
                            readString(readRecord(payload.event)?.reason) ??
                            "Muse Code failed a task without stating why"
                    }
                ];
        }

        return [
            {
                type: HarnessEventTypes.NATIVE,
                nativeType: readString(event.payload_type) ?? HarnessNativeEventTypes.UNKNOWN,
                payload: event
            }
        ];
    }

    finish(): readonly ParsedHarnessEvent[] {
        return [];
    }

    /**
     * The final message is both the answer a reader wants and, on a structured run, the JSON the
     * schema is checked against. Only a run that asked for a schema looks for one, so a plain run
     * whose last message happens to be JSON is never mistaken for a structured answer.
     */
    private parseTerminalCompleted(text: string): readonly ParsedHarnessEvent[] {
        if (this.#structured) {
            const candidate = museStructuredCandidate(text);
            if (candidate.found) {
                this.#structuredOutputCandidate = candidate.value;
                this.#hasStructuredOutputCandidate = true;
            }
        }

        return text ? [{ type: HarnessEventTypes.ASSISTANT_COMPLETED, text }] : [];
    }

    /**
     * A stream that changes session mid-run would have every later event filed under the session it
     * opened as, and the manifest would attribute one session's work to another. Muse can pass
     * messages between sessions, so a second id arriving here is not unthinkable — and there is no
     * reading of it that leaves the record true, so it stops the run instead.
     */
    private readSession(event: Readonly<Record<string, unknown>>): void {
        const stream = readRecord(event.stream);
        if (readString(stream?.kind) !== MuseStreamKinds.SESSION) {
            return;
        }
        const sessionId = readString(stream?.id);
        if (!sessionId) {
            return;
        }
        if (this.#sessionId && this.#sessionId !== sessionId) {
            throw new HarnessProtocolError(
                this.kind,
                `Muse reported session ${sessionId} on a stream that opened as ${this.#sessionId}`
            );
        }
        this.#sessionId = sessionId;
    }
}

/**
 * The tier is the model id, so the id is where a run being trained on shows up. It is reported as a
 * warning on the run itself rather than left to the manifest, because by the time anyone reads a
 * manifest the prompt has already been sent.
 */
function contributorTierWarning(modelId: string | undefined): readonly ParsedHarnessEvent[] {
    if (modelId !== MuseModels.CONTRIBUTOR) {
        return [];
    }

    return [
        {
            type: HarnessEventTypes.DIAGNOSTIC,
            level: HarnessDiagnosticLevels.WARNING,
            message: `This run uses ${MuseModels.CONTRIBUTOR}: Meta trains on its prompts and completions. Run the ${MuseModels.STANDARD} model instead to keep the work out of training.`
        }
    ];
}

/** A proposed task is a tool call only when its kind says so; model turns share the same record. */
function proposedToolCall(
    event: Readonly<Record<string, unknown>> | undefined
): readonly ParsedHarnessEvent[] {
    const taskKind = readString(event?.task_kind);
    if (!taskKind?.startsWith(MuseTaskKindPrefixes.TOOL)) {
        return [];
    }

    return [
        {
            type: HarnessEventTypes.TOOL,
            phase: HarnessToolPhases.STARTED,
            toolName: taskKind.slice(MuseTaskKindPrefixes.TOOL.length),
            callId: readString(event?.task_id) ?? null,
            payload: event
        }
    ];
}

function readRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Readonly<Record<string, unknown>>)
        : undefined;
}

function readString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}
