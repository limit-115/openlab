import type { HarnessKind, HarnessRunStatus } from "#src/agent-harness/agent-harness.const";
import type {
    HarnessArtifact,
    HarnessAuthentication,
    HarnessCommandRecord,
    HarnessSession
} from "#src/agent-harness/agent-harness.types";
import type { NonManifestArtifacts } from "#src/cli-agent-harness/harness-run-artifacts.types";

export interface StartedRunManifest {
    readonly kind: HarnessKind;
    readonly cliVersion: string;
    readonly authentication: HarnessAuthentication;
    readonly session: HarnessSession;
    readonly command: HarnessCommandRecord;
    readonly startedAt: string;
    readonly timeoutMs: number;
    readonly prompt: HarnessArtifact;
    readonly responseSchema?: HarnessArtifact;
}

export interface FinishedRunManifest {
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
    readonly artifacts: NonManifestArtifacts;
}
