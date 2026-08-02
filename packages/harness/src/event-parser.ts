import type {
    HarnessDiagnosticLevels,
    HarnessEventTypes,
    HarnessKind,
    HarnessToolPhases
} from "#src/contract";

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
          readonly phase: (typeof HarnessToolPhases)[keyof typeof HarnessToolPhases];
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
          readonly level: (typeof HarnessDiagnosticLevels)[keyof typeof HarnessDiagnosticLevels];
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
