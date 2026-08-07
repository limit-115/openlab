import { chmod, cp, mkdir, readdir, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { HarnessArtifact } from "#src/agent-harness/agent-harness.types";
import {
    SESSION_TRANSCRIPT_DIRECTORY,
    SessionTranscriptGaps
} from "#src/session-transcript/session-transcript.const";
import type {
    SessionTranscript,
    SessionTranscriptRequest
} from "#src/session-transcript/session-transcript.types";
import { hashArtifact } from "#src/subscription-cli-harness/harness-run-artifacts";
import { HARNESS_ARTIFACT_FILE_MODE } from "#src/subscription-cli-harness/harness-run-artifacts.const";

/**
 * Takes the lab's own copy of what the CLI recorded for this session, and hashes it.
 *
 * The copy is the point rather than the hash: the CLI's store is outside the lab, is pruned on the
 * vendor's schedule rather than the operator's, and would leave a run pointing at files that no
 * longer exist. A lab that can be copied to be kept and deleted to be rid of has to hold the whole
 * of what its agents did, and for a CLI that delegates that is mostly its subagents' transcripts.
 *
 * Collecting never fails a run. A run that produced an answer produced it whether or not the lab
 * could read the CLI's own account of it afterwards, so what stopped the copy is recorded and the
 * run keeps its result.
 */
export async function collectSessionTranscript(
    request: SessionTranscriptRequest
): Promise<SessionTranscript> {
    const { store } = request;
    if (request.sessionId === null) {
        return { source: store.root, files: [], gap: SessionTranscriptGaps.NO_SESSION };
    }

    try {
        const sources = await store.locate(request.sessionId);
        if (sources.length === 0) {
            return {
                source: store.root,
                files: [],
                gap: (await isDirectory(store.root))
                    ? SessionTranscriptGaps.NOT_FOUND
                    : SessionTranscriptGaps.NO_STORE
            };
        }

        const directory = join(resolve(request.artifactDirectory), SESSION_TRANSCRIPT_DIRECTORY);
        await mkdir(directory, { recursive: true });
        for (const source of sources) {
            await cp(source, join(directory, basename(source)), { recursive: true });
        }
        return { source: store.root, files: await hashCopiedTree(directory) };
    } catch (error) {
        return {
            source: store.root,
            files: [],
            gap: SessionTranscriptGaps.FAILED,
            detail: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Hashes every file the copy landed, in a fixed order so two manifests of the same session list it
 * the same way. The modes are brought to the ones the lab's own artifacts get: a transcript holds
 * everything the agent read, and the CLI it came from does not always keep it to itself.
 */
async function hashCopiedTree(directory: string): Promise<readonly HarnessArtifact[]> {
    const artifacts: HarnessArtifact[] = [];
    for (const entry of await readdir(directory, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile()) {
            continue;
        }
        const path = join(entry.parentPath, entry.name);
        await chmod(path, HARNESS_ARTIFACT_FILE_MODE);
        artifacts.push(await hashArtifact(path));
    }
    return artifacts.sort((left, right) => left.path.localeCompare(right.path));
}

async function isDirectory(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}
