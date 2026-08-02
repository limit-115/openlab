import { execa } from "execa";
import type {
    HarnessCaptureResult,
    HarnessProcessRequest,
    HarnessProcessRunner,
    HarnessStreamingProcess
} from "#src/cli-execution/cli-process-runner.types";

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
