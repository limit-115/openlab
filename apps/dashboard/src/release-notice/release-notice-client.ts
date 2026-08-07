import { ReleaseNoticeResponseSchema } from "@openlab/protocol/release-notice/release-notice.schema";
import type { ReleaseNoticeResponse } from "@openlab/protocol/release-notice/release-notice.types";

/** The one address the lab is asked whether a release it does not have is out. */
const RELEASE_NOTICE_ENDPOINT = "/api/release";

export const releaseNoticeQueryKey = ["lab", "release"] as const;

/**
 * What the lab knows about its own release.
 *
 * A lab run from its sources answers nothing here, because there is no installation for a release
 * to be newer than. That is an ordinary answer and not a failure, so it reads as nothing to say.
 */
export async function fetchReleaseNotice(
    signal?: AbortSignal
): Promise<ReleaseNoticeResponse | undefined> {
    const response = await fetch(RELEASE_NOTICE_ENDPOINT, {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });
    if (response.status === 404) {
        return undefined;
    }
    if (!response.ok) {
        throw new Error(`Release endpoint returned ${response.status}.`);
    }
    return ReleaseNoticeResponseSchema.parse(await response.json());
}
