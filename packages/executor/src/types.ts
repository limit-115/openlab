export type ExecutionStatus =
    | "running"
    | "succeeded"
    | "failed"
    | "timed_out"
    | "cancelled"
    | "spawn_error";

export interface ExplicitShellOptions {
    readonly enabled: true;
    readonly executable?: string;
}

export interface ExecutionRequest {
    readonly file: string;
    readonly args?: readonly string[];
    readonly cwd: string;
    readonly artifactDirectory: string;
    readonly env?: Readonly<Record<string, string>>;
    readonly inheritEnvironment?: boolean;
    readonly input?: string | Uint8Array;
    readonly timeoutMs?: number;
    readonly forceKillAfterMs?: number;
    readonly shell?: ExplicitShellOptions;
}

export interface ArtifactDescriptor {
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
}

export interface PendingArtifactDescriptor {
    readonly path: string;
    readonly bytes: null;
    readonly sha256: null;
}

export interface RecordedEnvironmentValue {
    readonly sha256: string;
}

export interface RecordedEnvironment {
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
    readonly nodeVersion: string;
    readonly inherited: boolean;
    readonly overrides: Readonly<Record<string, RecordedEnvironmentValue>>;
}

export interface RecordedCommand {
    readonly file: string;
    readonly args: readonly string[];
    readonly cwd: string;
    readonly shell: false | { readonly executable: string | null };
}

export interface RunningExecutionRecord {
    readonly schemaVersion: 1;
    readonly status: "running";
    readonly command: RecordedCommand;
    readonly environment: RecordedEnvironment;
    readonly startedAt: string;
    readonly stdout: PendingArtifactDescriptor;
    readonly stderr: PendingArtifactDescriptor;
    readonly input?: ArtifactDescriptor;
}

export interface CompletedExecutionRecord {
    readonly schemaVersion: 1;
    readonly status: Exclude<ExecutionStatus, "running">;
    readonly command: RecordedCommand;
    readonly environment: RecordedEnvironment;
    readonly startedAt: string;
    readonly finishedAt: string;
    readonly durationMs: number;
    readonly exitCode: number | null;
    readonly signal: string | null;
    readonly error: string | null;
    readonly stdout: ArtifactDescriptor;
    readonly stderr: ArtifactDescriptor;
    readonly input?: ArtifactDescriptor;
}

export interface ExecutionResult extends CompletedExecutionRecord {
    readonly manifest: ArtifactDescriptor;
}
