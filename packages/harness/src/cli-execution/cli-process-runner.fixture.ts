import { Readable } from "node:stream";
import type {
    HarnessCaptureResult,
    HarnessProcessExit,
    HarnessProcessRequest,
    HarnessProcessRunner,
    HarnessStreamingProcess
} from "#src/cli-execution/cli-process-runner.types";

export const TestProcessSignals = {
    TERMINATE: "SIGTERM"
} as const;

export type FakeCaptureResult =
    | HarnessCaptureResult
    | ((request: HarnessProcessRequest) => Promise<HarnessCaptureResult>);

export class FakeHarnessProcessRunner implements HarnessProcessRunner {
    readonly captureRequests: HarnessProcessRequest[] = [];
    readonly spawnRequests: HarnessProcessRequest[] = [];
    readonly #captureResults: FakeCaptureResult[];
    nextStream:
        | HarnessStreamingProcess
        | ((request: HarnessProcessRequest) => HarnessStreamingProcess)
        | undefined;

    constructor(captureResults: readonly FakeCaptureResult[]) {
        this.#captureResults = [...captureResults];
    }

    async capture(request: HarnessProcessRequest): Promise<HarnessCaptureResult> {
        this.captureRequests.push(request);
        const result = this.#captureResults.shift();
        if (!result) {
            throw new Error("No fake capture result configured");
        }
        return typeof result === "function" ? result(request) : result;
    }

    spawn(request: HarnessProcessRequest): HarnessStreamingProcess {
        this.spawnRequests.push(request);
        if (!this.nextStream) {
            throw new Error("No fake stream result configured");
        }
        return typeof this.nextStream === "function" ? this.nextStream(request) : this.nextStream;
    }
}

export function captureSuccess(stdout: string): HarnessCaptureResult {
    return {
        stdout,
        exitCode: 0,
        signal: null,
        failed: false,
        cancelled: false,
        stderr: "",
        error: null
    };
}

export function streamSuccess(
    events: readonly Readonly<Record<string, unknown>>[]
): HarnessStreamingProcess {
    const exit: HarnessProcessExit = {
        exitCode: 0,
        signal: null,
        failed: false,
        cancelled: false,
        stderr: "",
        error: null
    };
    return {
        stdout: Readable.from(events.map((event) => `${JSON.stringify(event)}\n`)),
        completed: Promise.resolve(exit)
    };
}

export function captureCancellationOnAbort(
    request: HarnessProcessRequest
): Promise<HarnessCaptureResult> {
    return new Promise((resolveCapture) => {
        const resolve = () =>
            resolveCapture({
                stdout: "",
                exitCode: null,
                signal: TestProcessSignals.TERMINATE,
                failed: true,
                cancelled: true,
                stderr: "watchdog cancelled preflight",
                error: "watchdog cancelled preflight"
            });
        if (request.signal?.aborted) {
            resolve();
            return;
        }
        request.signal?.addEventListener("abort", resolve, { once: true });
    });
}

export function streamUntilAbort(
    request: HarnessProcessRequest,
    events: readonly Readonly<Record<string, unknown>>[]
): HarnessStreamingProcess {
    const completed = new Promise<HarnessProcessExit>((_resolveExit, rejectExit) => {
        const reject = () => rejectExit(new Error("watchdog rejected the run process"));
        if (request.signal?.aborted) {
            reject();
            return;
        }
        request.signal?.addEventListener("abort", reject, { once: true });
    });
    return {
        stdout: Readable.from(events.map((event) => `${JSON.stringify(event)}\n`)),
        completed
    };
}

export function invalidStreamUntilAbort(request: HarnessProcessRequest): HarnessStreamingProcess {
    const completed = new Promise<HarnessProcessExit>((resolveExit) => {
        request.signal?.addEventListener(
            "abort",
            () => {
                resolveExit({
                    exitCode: null,
                    signal: TestProcessSignals.TERMINATE,
                    failed: true,
                    cancelled: true,
                    stderr: "protocol failure cancelled run",
                    error: "protocol failure cancelled run"
                });
            },
            { once: true }
        );
    });
    return {
        stdout: Readable.from(["not-json\n"]),
        completed
    };
}
