import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";

export interface ValidatedArtifact {
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
}

export async function validateFileArtifact(
    containmentRoot: string,
    candidatePath: string
): Promise<ValidatedArtifact> {
    const canonicalRoot = await realpath(containmentRoot);
    const requestedPath = path.isAbsolute(candidatePath)
        ? candidatePath
        : path.resolve(canonicalRoot, candidatePath);
    const canonicalPath = await realpath(requestedPath);
    const relativePath = path.relative(canonicalRoot, canonicalPath);
    if (
        relativePath === ".." ||
        relativePath.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativePath)
    ) {
        throw new Error(`Artifact escapes its isolated workspace: ${candidatePath}`);
    }

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
