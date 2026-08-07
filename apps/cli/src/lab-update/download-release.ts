import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReleaseArtifact } from "@openlab/core/release-channel/release-manifest.types";
import { UpdateError } from "#src/lab-update/update-error";

/**
 * Downloads one artifact, and refuses it unless it is the one the manifest described.
 *
 * The digest is taken while the bytes go past rather than by reading the file back afterwards: an
 * archive is tens of megabytes and there is no reason for it to be read twice.
 *
 * A mismatch is not retried. The manifest and the archive are two separate fetches, so the two
 * disagreeing means one of them is not what the release published, and asking again would at best
 * get the same answer.
 */
export async function downloadArtifact(
    from: string,
    artifact: ReleaseArtifact,
    into: string
): Promise<string> {
    const archive = path.join(into, artifact.file);
    const response = await fetch(from).catch(() => {
        throw new UpdateError(`Could not reach ${from}.`);
    });
    if (!response.ok || response.body === null) {
        throw new UpdateError(`Could not download ${artifact.file} (${response.status}).`);
    }

    const digest = createHash("sha256");
    await pipeline(
        Readable.fromWeb(response.body),
        async function* (chunks) {
            for await (const chunk of chunks) {
                digest.update(chunk);
                yield chunk;
            }
        },
        createWriteStream(archive)
    );

    const actual = digest.digest("hex");
    if (actual !== artifact.sha256) {
        throw new UpdateError(
            [
                `Checksum mismatch for ${artifact.file}.`,
                `  expected  ${artifact.sha256}`,
                `  actual    ${actual}`,
                "Nothing was installed. This is worth reporting rather than retrying."
            ].join("\n")
        );
    }
    return archive;
}
