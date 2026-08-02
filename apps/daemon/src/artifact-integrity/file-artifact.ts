import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";

export interface ValidatedArtifact {
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
}

/**
 * Hashing is what turns a file into evidence: the recorded digest is how a later run proves the file
 * it re-reads is the file that was measured. Where an agent chose to put that file is not the
 * daemon's business, so a relative path is resolved against the given directory and nothing else is
 * required of its location.
 */
export async function validateFileArtifact(
    baseDirectory: string,
    candidatePath: string
): Promise<ValidatedArtifact> {
    const canonicalPath = await realpath(path.resolve(baseDirectory, candidatePath));
    const metadata = await stat(canonicalPath);
    if (!metadata.isFile()) {
        throw new Error(`Artifact is not a regular file: ${candidatePath}`);
    }

    const hash = createHash("sha256");
    let bytes = 0;
    for await (const chunk of createReadStream(canonicalPath)) {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += data.byteLength;
        hash.update(data);
    }

    return {
        path: canonicalPath,
        bytes,
        sha256: hash.digest("hex")
    };
}
