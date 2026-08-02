import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import type {
    HarnessDiagnosticLevel,
    HarnessEventTypes,
    HarnessToolPhase
} from "#src/agent-harness/harness-event.const";

export type ParsedHarnessEvent =
    | { readonly type: typeof HarnessEventTypes.SESSION_STARTED; readonly resumed: boolean }
    | {
          readonly type:
              | typeof HarnessEventTypes.ASSISTANT_DELTA
              | typeof HarnessEventTypes.ASSISTANT_COMPLETED
              | typeof HarnessEventTypes.REASONING_DELTA
              | typeof HarnessEventTypes.REASONING_COMPLETED;
          readonly text: string;
      }
    | {
          readonly type: typeof HarnessEventTypes.TOOL;
          readonly phase: HarnessToolPhase;
          readonly toolName: string;
          readonly callId: string | null;
          readonly payload: unknown;
      }
    | {
          readonly type: typeof HarnessEventTypes.USAGE;
          readonly inputTokens: number | null;
          readonly outputTokens: number | null;
          readonly cachedInputTokens: number | null;
      }
    | {
          readonly type: typeof HarnessEventTypes.DIAGNOSTIC;
          readonly level: HarnessDiagnosticLevel;
          readonly message: string;
      }
    | {
          readonly type: typeof HarnessEventTypes.NATIVE;
          readonly nativeType: string;
          readonly payload: Readonly<Record<string, unknown>>;
      };

export interface HarnessEventParser {
    readonly kind: HarnessKind;
    readonly sessionId: string | null;
    readonly structuredOutputCandidate: unknown;
    readonly hasStructuredOutputCandidate: boolean;
    parse(event: Readonly<Record<string, unknown>>): readonly ParsedHarnessEvent[];
    finish(): readonly ParsedHarnessEvent[];
}
