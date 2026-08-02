import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { execa } from "execa";
import writeFileAtomic from "write-file-atomic";
import { DECLARED_OUTPUT_STATUS, EXECUTION_STATUS, type ExecutionStatus } from "#src/constants";
import { ArtifactDirectoryExistsError, ExecutionRequestError } from "#src/errors";
import type {
    ArtifactDescriptor,
    CompletedExecutionRecord,
    DeclaredOutputRecord,
    ExecutionRequest,
    ExecutionResult,
    RecordedCommand,
    RecordedEnvironment,
    RunningExecutionRecord
} from "#src/types";

const MANIFEST_FILE = "execution.json";
const STDOUT_FILE = "stdout.log";
const STDERR_FILE = "stderr.log";
const INPUT_FILE = "stdin.bin";

interface ProcessResult {
    readonly durationMs: number;
    readonly failed: boolean;
    readonly timedOut: boolean;
    readonly isCanceled: boolean;
    readonly exitCode?: number | undefined;
    readonly signal?: string | undefined;
    readonly shortMessage?: string | undefined;
    readonly originalMessage?: string | undefined;
}

export async function runExperiment(
    request: ExecutionRequest,
    signal?: AbortSignal
): Promise<ExecutionResult> {
    validateRequest(request);

    const artifactDirectory = resolve(request.artifactDirectory);
    const cwd = resolve(request.cwd);
    await createExclusiveArtifactDirectory(artifactDirectory);

    const stdoutPath = resolve(artifactDirectory, STDOUT_FILE);
    const stderrPath = resolve(artifactDirectory, STDERR_FILE);
    const manifestPath = resolve(artifactDirectory, MANIFEST_FILE);
    await Promise.all([createEmptyFile(stdoutPath), createEmptyFile(stderrPath)]);

    const input = await persistInput(request.input, artifactDirectory);
    const command = recordCommand(request, cwd);
    const environment = recordEnvironment(request);
    const startedAt = new Date().toISOString();
    const runningRecord: RunningExecutionRecord = {
        schemaVersion: 1,
        status: EXECUTION_STATUS.RUNNING,
        command,
        environment,
        startedAt,
        stdout: { path: stdoutPath, bytes: null, sha256: null },
        stderr: { path: stderrPath, bytes: null, sha256: null },
        ...(input === undefined ? {} : { input })
    };
    await writeManifest(manifestPath, runningRecord);

    const startedTime = performance.now();
    let processResult: ProcessResult | undefined;
    let unexpectedError: unknown;

    try {
        processResult = await execa(request.file, request.args ?? [], {
            cwd,
            extendEnv: request.inheritEnvironment ?? true,
            stdout: { file: stdoutPath },
            stderr: { file: stderrPath },
            reject: false,
            forceKillAfterDelay: request.forceKillAfterMs ?? 5_000,
            shell: request.shell?.executable ?? request.shell?.enabled ?? false,
            stripFinalNewline: false,
            ...(request.env === undefined ? {} : { env: request.env }),
            ...(request.input === undefined ? {} : { input: request.input }),
            ...(request.timeoutMs === undefined ? {} : { timeout: request.timeoutMs }),
            ...(signal === undefined ? {} : { cancelSignal: signal })
        });
    } catch (error) {
        unexpectedError = error;
    }

    const [stdout, stderr, declaredOutputs] = await Promise.all([
        hashArtifact(stdoutPath),
        hashArtifact(stderrPath),
        recordDeclaredOutputs(cwd, request.declaredOutputPaths ?? [])
    ]);
    const finishedAt = new Date().toISOString();
    const completedRecord: CompletedExecutionRecord = {
        schemaVersion: 1,
        status: determineStatus(processResult, unexpectedError),
        command,
        environment,
        startedAt,
        finishedAt,
        durationMs: processResult?.durationMs ?? performance.now() - startedTime,
        exitCode: processResult?.exitCode ?? null,
        signal: processResult?.signal ?? null,
        error: errorMessage(processResult, unexpectedError),
        stdout,
        stderr,
        declaredOutputs,
        ...(input === undefined ? {} : { input })
    };

    await writeManifest(manifestPath, completedRecord);
    const manifest = await hashArtifact(manifestPath);
    return {
        ...completedRecord,
        manifest
    };
}

async function recordDeclaredOutputs(
    cwd: string,
    requestedPaths: readonly string[]
): Promise<DeclaredOutputRecord[]> {
    const canonicalCwd = await realpath(cwd);
    return Promise.all(
        requestedPaths.map(async (requestedPath) => {
            try {
                const candidate = resolve(canonicalCwd, requestedPath);
                const canonicalPath = await realpath(candidate);
                const relativePath = relative(canonicalCwd, canonicalPath);
                if (
                    relativePath === ".." ||
                    relativePath.startsWith(`..${sep}`) ||
                    isAbsolute(relativePath)
                ) {
                    throw new Error("declared output escapes the execution workspace");
                }
                const metadata = await stat(canonicalPath);
                if (!metadata.isFile()) {
                    throw new Error("declared output is not a regular file");
                }
                return {
                    requestedPath,
                    status: DECLARED_OUTPUT_STATUS.RECORDED,
                    artifact: await hashArtifact(canonicalPath)
                };
            } catch (error) {
                const missing = isNodeError(error) && error.code === "ENOENT";
                return {
                    requestedPath,
                    status: missing
                        ? DECLARED_OUTPUT_STATUS.MISSING
                        : DECLARED_OUTPUT_STATUS.INVALID,
                    error: error instanceof Error ? error.message : String(error)
                };
            }
        })
    );
}

function validateRequest(request: ExecutionRequest): void {
    if (!request.file.trim()) {
        throw new ExecutionRequestError("Executable file cannot be empty");
    }

    if (!request.cwd.trim()) {
        throw new ExecutionRequestError("Working directory cannot be empty");
    }

    if (!request.artifactDirectory.trim()) {
        throw new ExecutionRequestError("Artifact directory cannot be empty");
    }

    if (
        request.timeoutMs !== undefined &&
        (!Number.isFinite(request.timeoutMs) || request.timeoutMs <= 0)
    ) {
        throw new ExecutionRequestError("timeoutMs must be a positive finite number");
    }

    if (
        request.forceKillAfterMs !== undefined &&
        (!Number.isFinite(request.forceKillAfterMs) || request.forceKillAfterMs < 0)
    ) {
        throw new ExecutionRequestError("forceKillAfterMs must be a non-negative finite number");
    }

    for (const declaredOutputPath of request.declaredOutputPaths ?? []) {
        if (!declaredOutputPath.trim()) {
            throw new ExecutionRequestError("Declared output path cannot be empty");
        }
        if (isAbsolute(declaredOutputPath)) {
            throw new ExecutionRequestError("Declared output path must be relative to cwd");
        }
        const resolvedPath = resolve(request.cwd, declaredOutputPath);
        const relativePath = relative(resolve(request.cwd), resolvedPath);
        if (relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
            throw new ExecutionRequestError("Declared output path cannot escape cwd");
        }
    }
}

async function createExclusiveArtifactDirectory(artifactDirectory: string): Promise<void> {
    await mkdir(dirname(artifactDirectory), { recursive: true });
    try {
        await mkdir(artifactDirectory);
    } catch (error) {
        if (isNodeError(error) && error.code === "EEXIST") {
            throw new ArtifactDirectoryExistsError(artifactDirectory, error);
        }

        throw new ExecutionRequestError(`Cannot create artifact directory: ${artifactDirectory}`, {
            cause: error
        });
    }
}

async function createEmptyFile(path: string): Promise<void> {
    const handle = await open(path, "wx");
    await handle.close();
}

async function persistInput(
    input: string | Uint8Array | undefined,
    artifactDirectory: string
): Promise<ArtifactDescriptor | undefined> {
    if (input === undefined) {
        return undefined;
    }

    const path = resolve(artifactDirectory, INPUT_FILE);
    await writeFile(path, input, { flag: "wx" });
    return hashArtifact(path);
}

function recordCommand(request: ExecutionRequest, cwd: string): RecordedCommand {
    return {
        file: request.file,
        args: [...(request.args ?? [])],
        cwd,
        shell: request.shell ? { executable: request.shell.executable ?? null } : false
    };
}

function recordEnvironment(request: ExecutionRequest): RecordedEnvironment {
    return {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
        inherited: request.inheritEnvironment ?? true,
        overrides: Object.fromEntries(
            Object.entries(request.env ?? {})
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([name, value]) => [name, { sha256: hashBytes(value) }])
        )
    };
}

function determineStatus(
    result: ProcessResult | undefined,
    unexpectedError: unknown
): Exclude<ExecutionStatus, typeof EXECUTION_STATUS.RUNNING> {
    if (!result) {
        return EXECUTION_STATUS.SPAWN_ERROR;
    }

    if (result.timedOut) {
        return EXECUTION_STATUS.TIMED_OUT;
    }

    if (result.isCanceled) {
        return EXECUTION_STATUS.CANCELLED;
    }

    if (!result.failed && result.exitCode === 0) {
        return EXECUTION_STATUS.SUCCEEDED;
    }

    if (result.exitCode === undefined && !result.signal && unexpectedError === undefined) {
        return EXECUTION_STATUS.SPAWN_ERROR;
    }

    return EXECUTION_STATUS.FAILED;
}

function errorMessage(result: ProcessResult | undefined, unexpectedError: unknown): string | null {
    if (unexpectedError instanceof Error) {
        return unexpectedError.message;
    }

    if (unexpectedError !== undefined) {
        return String(unexpectedError);
    }

    return result?.shortMessage ?? result?.originalMessage ?? null;
}

async function writeManifest(
    path: string,
    record: RunningExecutionRecord | CompletedExecutionRecord
): Promise<void> {
    await writeFileAtomic(path, `${JSON.stringify(record, null, 4)}\n`, {
        encoding: "utf8",
        mode: 0o600
    });
}

async function hashArtifact(path: string): Promise<ArtifactDescriptor> {
    const hash = createHash("sha256");
    let bytes = 0;

    for await (const chunk of createReadStream(path)) {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += data.byteLength;
        hash.update(data);
    }

    return {
        path,
        bytes,
        sha256: hash.digest("hex")
    };
}

function hashBytes(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error && "code" in error;
}
