import type { Readable } from "node:stream";

export interface HarnessProcessRequest {
    readonly file: string;
    readonly args: readonly string[];
    readonly cwd: string;
    readonly environment: Readonly<Record<string, string>>;
    readonly input?: string;
    readonly signal?: AbortSignal;
}

export interface HarnessProcessExit {
    readonly exitCode: number | null;
    readonly signal: string | null;
    readonly failed: boolean;
    readonly cancelled: boolean;
    readonly stderr: string;
    readonly error: string | null;
}

export interface HarnessCaptureResult extends HarnessProcessExit {
    readonly stdout: string;
}

export interface HarnessStreamingProcess {
    readonly stdout: Readable;
    readonly completed: Promise<HarnessProcessExit>;
}

export interface HarnessProcessRunner {
    capture(request: HarnessProcessRequest): Promise<HarnessCaptureResult>;
    spawn(request: HarnessProcessRequest): HarnessStreamingProcess;
}
