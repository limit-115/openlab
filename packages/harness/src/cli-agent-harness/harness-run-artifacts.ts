import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import type { HarnessArtifact, HarnessRunRequest } from "#src/agent-harness/agent-harness.types";
import {
    HARNESS_ARTIFACT_FILE_MODE,
    HarnessArtifactFiles
} from "#src/cli-agent-harness/harness-run-artifacts.const";
import type {
    HarnessRunFiles,
    NonManifestArtifacts
} from "#src/cli-agent-harness/harness-run-artifacts.types";
import { responseJsonSchema } from "#src/cli-agent-harness/response-schema";
import { HarnessRequestError } from "#src/cli-execution/harness-error";

/**
 * `promptText` is what the CLI will actually be given, which is not always what the caller wrote: a
 * CLI with no structured-output flag has to be asked for its schema in words. The artifact records
 * the sent text rather than the requested one, so the hash beside a run answers what the model read.
 */
export async function createRunFiles(
    kind: HarnessKind,
    request: HarnessRunRequest,
    promptText: string
): Promise<HarnessRunFiles> {
    const artifactDirectory = resolve(request.artifactDirectory);
    await mkdir(dirname(artifactDirectory), { recursive: true });
    try {
        await mkdir(artifactDirectory);
    } catch (error) {
        throw new HarnessRequestError(
            kind,
            `Harness artifact directory must not already exist: ${artifactDirectory}`,
            { cause: error }
        );
    }

    const promptPath = resolve(artifactDirectory, HarnessArtifactFiles.PROMPT);
    await writeFile(promptPath, promptText, {
        encoding: "utf8",
        flag: "wx",
        mode: HARNESS_ARTIFACT_FILE_MODE
    });
    const prompt = await hashArtifact(promptPath);
    let responseSchema: HarnessArtifact | undefined;
    if (request.responseSchema) {
        const responseSchemaPath = resolve(artifactDirectory, HarnessArtifactFiles.RESPONSE_SCHEMA);
        await writeFile(
            responseSchemaPath,
            `${JSON.stringify(responseJsonSchema(request.responseSchema), null, 4)}\n`,
            {
                encoding: "utf8",
                flag: "wx",
                mode: HARNESS_ARTIFACT_FILE_MODE
            }
        );
        responseSchema = await hashArtifact(responseSchemaPath);
    }

    const nativeEventsPath = resolve(artifactDirectory, HarnessArtifactFiles.NATIVE_EVENTS);
    const eventsPath = resolve(artifactDirectory, HarnessArtifactFiles.EVENTS);
    const stderrPath = resolve(artifactDirectory, HarnessArtifactFiles.STDERR);
    const manifestPath = resolve(artifactDirectory, HarnessArtifactFiles.MANIFEST);
    const [nativeEventsHandle, eventsHandle] = await Promise.all([
        open(nativeEventsPath, "wx", HARNESS_ARTIFACT_FILE_MODE),
        open(eventsPath, "wx", HARNESS_ARTIFACT_FILE_MODE)
    ]);

    return {
        artifactDirectory,
        prompt,
        ...(responseSchema === undefined ? {} : { responseSchema }),
        nativeEventsPath,
        eventsPath,
        stderrPath,
        manifestPath,
        nativeEventsHandle,
        eventsHandle
    };
}

export async function writeStderrArtifact(stderrPath: string, stderr: string): Promise<void> {
    await writeFile(stderrPath, stderr, {
        encoding: "utf8",
        flag: "wx",
        mode: HARNESS_ARTIFACT_FILE_MODE
    });
}

export async function closeRunFiles(files: HarnessRunFiles): Promise<void> {
    await Promise.all([files.nativeEventsHandle.close(), files.eventsHandle.close()]);
}

export async function collectArtifacts(files: HarnessRunFiles): Promise<NonManifestArtifacts> {
    const [nativeEvents, events, stderr] = await Promise.all([
        hashArtifact(files.nativeEventsPath),
        hashArtifact(files.eventsPath),
        hashArtifact(files.stderrPath)
    ]);
    return {
        prompt: files.prompt,
        nativeEvents,
        events,
        stderr,
        ...(files.responseSchema === undefined ? {} : { responseSchema: files.responseSchema })
    };
}

export async function hashArtifact(path: string): Promise<HarnessArtifact> {
    const hash = createHash("sha256");
    let bytes = 0;
    for await (const chunk of createReadStream(path)) {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += data.byteLength;
        hash.update(data);
    }
    return { path, bytes, sha256: hash.digest("hex") };
}
