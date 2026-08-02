import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import type { HarnessRunResult } from "#src/agent-harness/agent-harness.types";
import type {
    HarnessDiagnosticLevel,
    HarnessEventTypes,
    HarnessToolPhase
} from "#src/agent-harness/harness-event.const";

interface HarnessEventBase {
    readonly sequence: number;
    readonly occurredAt: string;
    readonly harness: HarnessKind;
    readonly sessionId: string | null;
}

export interface HarnessSessionEvent extends HarnessEventBase {
    readonly type: typeof HarnessEventTypes.SESSION_STARTED;
    readonly resumed: boolean;
}

export interface HarnessTextEvent extends HarnessEventBase {
    readonly type:
        | typeof HarnessEventTypes.ASSISTANT_DELTA
        | typeof HarnessEventTypes.ASSISTANT_COMPLETED
        | typeof HarnessEventTypes.REASONING_DELTA
        | typeof HarnessEventTypes.REASONING_COMPLETED;
    readonly text: string;
}

export interface HarnessToolEvent extends HarnessEventBase {
    readonly type: typeof HarnessEventTypes.TOOL;
    readonly phase: HarnessToolPhase;
    readonly toolName: string;
    readonly callId: string | null;
    readonly payload: unknown;
}

export interface HarnessStructuredOutputEvent extends HarnessEventBase {
    readonly type: typeof HarnessEventTypes.STRUCTURED_OUTPUT;
    readonly value: unknown;
}

export interface HarnessUsageEvent extends HarnessEventBase {
    readonly type: typeof HarnessEventTypes.USAGE;
    readonly inputTokens: number | null;
    readonly outputTokens: number | null;
    readonly cachedInputTokens: number | null;
}

export interface HarnessDiagnosticEvent extends HarnessEventBase {
    readonly type: typeof HarnessEventTypes.DIAGNOSTIC;
    readonly level: HarnessDiagnosticLevel;
    readonly message: string;
}

export interface HarnessNativeEvent extends HarnessEventBase {
    readonly type: typeof HarnessEventTypes.NATIVE;
    readonly nativeType: string;
    readonly payload: Readonly<Record<string, unknown>>;
}

export interface HarnessCompletedEvent extends HarnessEventBase {
    readonly type: typeof HarnessEventTypes.RUN_COMPLETED;
    readonly result: HarnessRunResult;
}

export type HarnessEvent =
    | HarnessSessionEvent
    | HarnessTextEvent
    | HarnessToolEvent
    | HarnessStructuredOutputEvent
    | HarnessUsageEvent
    | HarnessDiagnosticEvent
    | HarnessNativeEvent
    | HarnessCompletedEvent;
