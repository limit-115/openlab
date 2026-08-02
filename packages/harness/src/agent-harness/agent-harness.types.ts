import type { z } from "zod";
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

/**
 * The model and reasoning effort a run executes with once harness defaults have filled in whatever
 * the request left unset. Every harness resolves one, so a run is never left to a machine-local or
 * vendor default.
 */
export interface HarnessSession {
    readonly model: string;
    readonly effort: HarnessEffortLevel;
}

export interface HarnessRunRequest {
    readonly prompt: string;
    readonly cwd: string;
    readonly artifactDirectory: string;
    readonly model?: string;
    readonly effort?: HarnessEffortLevel;
    /**
     * The schema a structured run must answer with. It arrives as Zod rather than JSON Schema so the
     * document handed to the CLI and the check applied to its answer are derived from one definition
     * and cannot drift; a caller therefore cannot hand over a schema that fails to compile.
     */
    readonly responseSchema?: z.ZodType;
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
    readonly session: HarnessSession;
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
    resolveSession(request: HarnessRunRequest): HarnessSession;
    preflight(signal?: AbortSignal): Promise<HarnessPreflight>;
    run(request: HarnessRunRequest, signal?: AbortSignal): AsyncIterable<HarnessEvent>;
}
