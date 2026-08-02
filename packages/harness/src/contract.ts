export const HarnessKinds = {
    CODEX: "codex",
    CLAUDE: "claude"
} as const;

export type HarnessKind = (typeof HarnessKinds)[keyof typeof HarnessKinds];

export const HarnessAuthenticationMethods = {
    CHATGPT: "chatgpt",
    CLAUDE_AI: "claude.ai"
} as const;

export type HarnessAuthenticationMethod =
    (typeof HarnessAuthenticationMethods)[keyof typeof HarnessAuthenticationMethods];

export const HarnessRunStatuses = {
    RUNNING: "running",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    CANCELLED: "cancelled"
} as const;

export const HarnessTimeoutMilliseconds = {
    PREFLIGHT: 30_000,
    RUN: 3_600_000
} as const;

export type HarnessRunStatus = Exclude<
    (typeof HarnessRunStatuses)[keyof typeof HarnessRunStatuses],
    typeof HarnessRunStatuses.RUNNING
>;

export const HarnessEventTypes = {
    SESSION_STARTED: "session_started",
    ASSISTANT_DELTA: "assistant_delta",
    ASSISTANT_COMPLETED: "assistant_completed",
    REASONING_DELTA: "reasoning_delta",
    REASONING_COMPLETED: "reasoning_completed",
    TOOL: "tool",
    STRUCTURED_OUTPUT: "structured_output",
    USAGE: "usage",
    DIAGNOSTIC: "diagnostic",
    NATIVE: "native",
    RUN_COMPLETED: "run_completed"
} as const;

export const HarnessToolPhases = {
    STARTED: "started",
    UPDATED: "updated",
    COMPLETED: "completed"
} as const;

export const HarnessDiagnosticLevels = {
    INFO: "info",
    WARNING: "warning",
    ERROR: "error"
} as const;

export const HarnessInputSources = {
    PROMPT: "prompt"
} as const;

export const HarnessNativeEventTypes = {
    UNKNOWN: "unknown"
} as const;

export interface HarnessAuthentication {
    readonly method: HarnessAuthenticationMethod;
    readonly subscription: string | null;
}

export interface HarnessPreflight {
    readonly kind: HarnessKind;
    readonly cliVersion: string;
    readonly authentication: HarnessAuthentication;
}

export interface HarnessRunRequest {
    readonly prompt: string;
    readonly cwd: string;
    readonly artifactDirectory: string;
    readonly model?: string;
    readonly responseSchema?: Readonly<Record<string, unknown>>;
    readonly resumeSessionId?: string;
    readonly timeoutMs?: number;
}

export interface HarnessArtifact {
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
}

export interface HarnessArtifacts {
    readonly prompt: HarnessArtifact;
    readonly nativeEvents: HarnessArtifact;
    readonly events: HarnessArtifact;
    readonly stderr: HarnessArtifact;
    readonly manifest: HarnessArtifact;
    readonly responseSchema?: HarnessArtifact;
}

export interface HarnessCommandRecord {
    readonly file: string;
    readonly args: readonly string[];
    readonly cwd: string;
    readonly stdin: (typeof HarnessInputSources)[keyof typeof HarnessInputSources];
    readonly removedEnvironmentVariables: readonly string[];
}

export interface HarnessRunResult {
    readonly kind: HarnessKind;
    readonly status: HarnessRunStatus;
    readonly cliVersion: string;
    readonly authentication: HarnessAuthentication;
    readonly sessionId: string | null;
    readonly structuredOutput?: unknown;
    readonly startedAt: string;
    readonly finishedAt: string;
    readonly exitCode: number | null;
    readonly signal: string | null;
    readonly error: string | null;
    readonly timeoutMs: number;
    readonly command: HarnessCommandRecord;
    readonly artifacts: HarnessArtifacts;
}

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
    readonly phase: (typeof HarnessToolPhases)[keyof typeof HarnessToolPhases];
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
    readonly level: (typeof HarnessDiagnosticLevels)[keyof typeof HarnessDiagnosticLevels];
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

export interface AgentHarness {
    readonly kind: HarnessKind;
    preflight(signal?: AbortSignal): Promise<HarnessPreflight>;
    run(request: HarnessRunRequest, signal?: AbortSignal): AsyncIterable<HarnessEvent>;
}
