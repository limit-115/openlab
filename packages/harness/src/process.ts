import type { Readable } from "node:stream";
import { execa } from "execa";

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

export class ExecaHarnessProcessRunner implements HarnessProcessRunner {
    async capture(request: HarnessProcessRequest): Promise<HarnessCaptureResult> {
        const result = await execa(request.file, request.args, {
            cwd: request.cwd,
            env: request.environment,
            extendEnv: false,
            reject: false,
            stripFinalNewline: true,
            ...(request.input === undefined ? {} : { input: request.input }),
            ...(request.signal === undefined ? {} : { cancelSignal: request.signal })
        });

        return {
            stdout: result.stdout,
            exitCode: result.exitCode ?? null,
            signal: result.signal ?? null,
            failed: result.failed,
            cancelled: result.isCanceled,
            stderr: result.stderr,
            error: result.shortMessage ?? result.originalMessage ?? null
        };
    }

    spawn(request: HarnessProcessRequest): HarnessStreamingProcess {
        const child = execa(request.file, request.args, {
            cwd: request.cwd,
            env: request.environment,
            extendEnv: false,
            reject: false,
            buffer: { stdout: false, stderr: true },
            stripFinalNewline: false,
            forceKillAfterDelay: 5_000,
            ...(request.input === undefined ? {} : { input: request.input }),
            ...(request.signal === undefined ? {} : { cancelSignal: request.signal })
        });

        return {
            stdout: child.stdout,
            completed: child.then((result) => ({
                exitCode: result.exitCode ?? null,
                signal: result.signal ?? null,
                failed: result.failed,
                cancelled: result.isCanceled,
                stderr: result.stderr,
                error: result.shortMessage ?? result.originalMessage ?? null
            }))
        };
    }
}
