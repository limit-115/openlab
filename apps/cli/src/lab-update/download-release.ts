import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReleaseArtifact } from "@openlab/core/release-channel/release-manifest.types";
import { DOWNLOAD_REPORT_EVERY, DOWNLOAD_STALL_MS } from "#src/lab-update/download-release.const";
import { UpdateError } from "#src/lab-update/update-error";
import { UpdateStep } from "#src/lab-update/update-progress.const";
import type { ReportUpdate } from "#src/lab-update/update-progress.types";

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
    into: string,
    report: ReportUpdate = () => {}
): Promise<string> {
    const archive = path.join(into, artifact.file);

    /**
     * A download is given no deadline and a silence is. A slow link is still a link and finishes if
     * it is left alone, whereas a connection that stopped arriving never says so — it holds the
     * command open until somebody gives up on it, which is the one failure an operator cannot tell
     * apart from the lab working.
     */
    const stalled = new AbortController();
    let silence = setTimeout(() => stalled.abort(), DOWNLOAD_STALL_MS);

    const response = await fetch(from, { signal: stalled.signal }).catch(() => {
        throw new UpdateError(`Could not reach ${from}.`);
    });
    if (!response.ok || response.body === null) {
        clearTimeout(silence);
        throw new UpdateError(`Could not download ${artifact.file} (${response.status}).`);
    }

    const digest = createHash("sha256");
    let received = 0;
    let told = 0;
    report({ step: UpdateStep.DOWNLOADING, file: artifact.file, received, total: artifact.size });

    try {
        await pipeline(
            Readable.fromWeb(response.body),
            async function* (chunks) {
                for await (const chunk of chunks) {
                    clearTimeout(silence);
                    silence = setTimeout(() => stalled.abort(), DOWNLOAD_STALL_MS);

                    digest.update(chunk);
                    received += chunk.length;
                    if (received - told >= DOWNLOAD_REPORT_EVERY) {
                        told = received;
                        report({
                            step: UpdateStep.DOWNLOADING,
                            file: artifact.file,
                            received,
                            total: artifact.size
                        });
                    }
                    yield chunk;
                }
            },
            createWriteStream(archive)
        );
    } catch {
        throw new UpdateError(
            stalled.signal.aborted
                ? `${artifact.file} stopped arriving. Nothing was installed.`
                : `Could not download ${artifact.file}. Nothing was installed.`
        );
    } finally {
        clearTimeout(silence);
    }

    /**
     * Said once more now it is over. Reporting only every megabyte leaves the last part of one
     * unsaid, so without this an archive finishes on a line still counting up towards its own size.
     */
    report({ step: UpdateStep.DOWNLOADING, file: artifact.file, received, total: artifact.size });

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
