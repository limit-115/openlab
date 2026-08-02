import { HarnessEventTypes } from "@lab/harness/harness-event.const";
import type { HarnessEvent, HarnessTextEvent } from "@lab/harness/harness-event.types";
import type { AgentRunIdentity } from "@lab/protocol/agent-activity/agent-activity.types";
import { AgentActivityFrameKind } from "@lab/protocol/agent-activity/agent-activity-frame.const";
import type { AgentActivityFrame } from "@lab/protocol/agent-activity/agent-activity-frame.types";
import {
    ActivityDiagnosticLevel,
    ActivityRunStatus,
    ActivityToolPhase,
    TOOL_DETAIL_KEYS,
    UNSPECIFIED_DIAGNOSTIC
} from "#src/agent-activity/agent-activity.const";
import type { AgentTextFrameKind } from "#src/agent-activity/harness-event-translation.types";

/**
 * Turns one run's harness events into the frames the dashboard renders. The same translation serves
 * the live stream and history replayed from the run's events.jsonl, so both sources agree by
 * construction rather than by two implementations staying in step.
 *
 * It is stateful only in numbering turns: a harness reports text without saying which turn it
 * belongs to, and a viewer needs that number to know which accumulated chunks a sealed turn replaces.
 */
export class HarnessEventTranslator {
    readonly #identity: AgentRunIdentity;
    readonly #turns: Record<AgentTextFrameKind, number> = {
        [AgentActivityFrameKind.THINKING]: 0,
        [AgentActivityFrameKind.MESSAGE]: 0
    };

    constructor(identity: AgentRunIdentity) {
        this.#identity = identity;
    }

    translate(event: HarnessEvent): AgentActivityFrame | undefined {
        const base = {
            agent_id: this.#identity.agent_id,
            run_id: this.#identity.run_id,
            sequence: event.sequence,
            occurred_at: event.occurredAt
        };

        switch (event.type) {
            case HarnessEventTypes.SESSION_STARTED:
                return {
                    ...this.#identity,
                    ...base,
                    kind: AgentActivityFrameKind.RUN_STARTED,
                    session_id: event.sessionId,
                    resumed: event.resumed
                };
            case HarnessEventTypes.REASONING_DELTA:
                return this.textFrame(base, event, AgentActivityFrameKind.THINKING, false);
            case HarnessEventTypes.REASONING_COMPLETED:
                return this.textFrame(base, event, AgentActivityFrameKind.THINKING, true);
            case HarnessEventTypes.ASSISTANT_DELTA:
                return this.textFrame(base, event, AgentActivityFrameKind.MESSAGE, false);
            case HarnessEventTypes.ASSISTANT_COMPLETED:
                return this.textFrame(base, event, AgentActivityFrameKind.MESSAGE, true);
            case HarnessEventTypes.TOOL:
                return {
                    ...base,
                    kind: AgentActivityFrameKind.TOOL,
                    tool_name: event.toolName,
                    call_id: event.callId,
                    phase: ActivityToolPhase[event.phase],
                    detail: toolDetail(event.payload)
                };
            case HarnessEventTypes.DIAGNOSTIC:
                return {
                    ...base,
                    kind: AgentActivityFrameKind.DIAGNOSTIC,
                    level: ActivityDiagnosticLevel[event.level],
                    message: event.message.trim() || UNSPECIFIED_DIAGNOSTIC
                };
            case HarnessEventTypes.USAGE:
                return {
                    ...base,
                    kind: AgentActivityFrameKind.USAGE,
                    usage: {
                        input_tokens: event.inputTokens,
                        output_tokens: event.outputTokens,
                        cached_input_tokens: event.cachedInputTokens
                    }
                };
            case HarnessEventTypes.RUN_COMPLETED:
                return {
                    ...base,
                    kind: AgentActivityFrameKind.RUN_FINISHED,
                    status: ActivityRunStatus[event.result.status],
                    error: nonEmpty(event.result.error)
                };
            /**
             * Native passthrough is harness plumbing, and the structured output is the run's
             * research result: the durable event log and the manifest carry it. Neither describes
             * what the agent is doing, so neither reaches the live stream.
             */
            case HarnessEventTypes.NATIVE:
            case HarnessEventTypes.STRUCTURED_OUTPUT:
                return undefined;
        }
    }

    private textFrame(
        base: Pick<AgentActivityFrame, "agent_id" | "run_id" | "sequence" | "occurred_at">,
        event: HarnessTextEvent,
        kind: AgentTextFrameKind,
        sealed: boolean
    ): AgentActivityFrame {
        const turn = this.#turns[kind];
        if (sealed) {
            this.#turns[kind] = turn + 1;
        }
        return { ...base, kind, turn, text: event.text, sealed };
    }
}

function toolDetail(payload: unknown): string | null {
    const record = readRecord(payload);
    return subject(record) ?? subject(readRecord(record?.input)) ?? null;
}

function subject(record: Readonly<Record<string, unknown>> | undefined): string | undefined {
    for (const key of TOOL_DETAIL_KEYS) {
        const value = record?.[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return undefined;
}

function readRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Readonly<Record<string, unknown>>)
        : undefined;
}

function nonEmpty(value: string | null): string | null {
    return value?.trim() ? value.trim() : null;
}
