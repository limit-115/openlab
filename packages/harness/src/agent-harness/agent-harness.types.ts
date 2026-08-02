import type {
    HarnessAuthenticationMethod,
    HarnessEffortLevel,
    HarnessExecutionProfile,
    HarnessInputSource,
    HarnessKind,
    HarnessRunStatus
} from "#src/agent-harness/agent-harness.const";
import type { HarnessEvent } from "#src/agent-harness/harness-event.types";

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
    readonly effort?: HarnessEffortLevel;
    readonly responseSchema?: Readonly<Record<string, unknown>>;
    readonly resumeSessionId?: string;
    readonly timeoutMs?: number;
    readonly executionProfile?: HarnessExecutionProfile;
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
    readonly stdin: HarnessInputSource;
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

export interface AgentHarness {
    readonly kind: HarnessKind;
    preflight(signal?: AbortSignal): Promise<HarnessPreflight>;
    run(request: HarnessRunRequest, signal?: AbortSignal): AsyncIterable<HarnessEvent>;
}
