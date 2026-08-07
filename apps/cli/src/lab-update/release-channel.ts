import { ReleaseManifestSchema } from "@openlab/core/release-channel/release-manifest.schema";
import type { ReleaseManifest } from "@openlab/core/release-channel/release-manifest.types";
import {
    DEFAULT_RELEASES_URL,
    MANIFEST_FILE,
    MANIFEST_TIMEOUT_MS,
    UpdateEnvironment
} from "#src/lab-update/release-channel.const";
import { UpdateError } from "#src/lab-update/update-error";

/** Where releases are fetched from, which an operator running a mirror is allowed to say. */
export function releasesUrl(environment: NodeJS.ProcessEnv = process.env): string {
    const named = environment[UpdateEnvironment.RELEASES_URL]?.trim();
    return named === undefined || named.length === 0
        ? DEFAULT_RELEASES_URL
        : named.replace(/\/+$/, "");
}

/** Where one release keeps the files it published. */
export function releaseUrl(version: string, environment: NodeJS.ProcessEnv = process.env): string {
    return `${releasesUrl(environment)}/download/v${version}`;
}

/** What an operator reads to find out what they are about to install. */
export function releaseNotesUrl(
    version: string,
    environment: NodeJS.ProcessEnv = process.env
): string {
    return `${releasesUrl(environment)}/tag/v${version}`;
}

/**
 * What the channel offers: the release it currently serves, or the one an operator named.
 *
 * Every asset of the newest release is served under `latest/download` as well as under its own tag,
 * so finding out which version that is costs no request of its own. The manifest fetched from there
 * states it, and the rest of the update is pinned to what this one file said rather than to
 * whichever release happens to be newest by the time each file is asked for.
 */
export async function offeredRelease(
    version: string | undefined,
    environment: NodeJS.ProcessEnv = process.env,
    timeoutMs: number = MANIFEST_TIMEOUT_MS
): Promise<ReleaseManifest> {
    const from =
        version === undefined
            ? `${releasesUrl(environment)}/latest/download/${MANIFEST_FILE}`
            : `${releaseUrl(version, environment)}/${MANIFEST_FILE}`;

    const parsed = ReleaseManifestSchema.safeParse(await fetchJson(from, version, timeoutMs));
    if (!parsed.success) {
        throw new UpdateError(
            `${from} is not a release manifest this lab can read. Nothing was installed.`
        );
    }
    return parsed.data;
}

async function fetchJson(
    from: string,
    version: string | undefined,
    timeoutMs: number
): Promise<unknown> {
    const response = await fetch(from, { signal: AbortSignal.timeout(timeoutMs) }).catch(() => {
        throw new UpdateError(`Could not reach ${from}.`);
    });

    if (response.status === 404 && version !== undefined) {
        throw new UpdateError(`There is no release ${version}. Nothing was installed.`);
    }
    if (!response.ok) {
        throw new UpdateError(`Could not read ${from} (${response.status}).`);
    }
    return response.json().catch(() => {
        throw new UpdateError(`${from} did not answer with a release manifest.`);
    });
}
