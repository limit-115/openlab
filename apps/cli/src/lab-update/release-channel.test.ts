import { describe, expect, it } from "vitest";
import { releaseNotesUrl, releasesUrl, releaseUrl } from "#src/lab-update/release-channel";
import { DEFAULT_RELEASES_URL, UpdateEnvironment } from "#src/lab-update/release-channel.const";

describe("where a lab fetches releases from", () => {
    it("publishes from the release page when the operator named nowhere else", () => {
        expect(releasesUrl({})).toBe(DEFAULT_RELEASES_URL);
        expect(releasesUrl({ [UpdateEnvironment.RELEASES_URL]: "   " })).toBe(DEFAULT_RELEASES_URL);
    });

    /** An operator running a mirror states it once and both the install and the update follow. */
    it("obeys the mirror an operator named", () => {
        const mirror = { [UpdateEnvironment.RELEASES_URL]: "https://mirror.example/releases" };

        expect(releasesUrl(mirror)).toBe("https://mirror.example/releases");
    });

    /** A mirror written with a trailing slash must not produce a URL with two of them in it. */
    it("does not double the separator a trailing slash already left", () => {
        const mirror = { [UpdateEnvironment.RELEASES_URL]: "https://mirror.example/releases//" };

        expect(releaseUrl("0.2.0", mirror)).toBe("https://mirror.example/releases/download/v0.2.0");
    });

    /** Every archive of a release is published under the tag its version names. */
    it("asks for a version under the tag it was published as", () => {
        expect(releaseUrl("0.2.0", {})).toBe(`${DEFAULT_RELEASES_URL}/download/v0.2.0`);
        expect(releaseNotesUrl("0.2.0", {})).toBe(`${DEFAULT_RELEASES_URL}/tag/v0.2.0`);
    });
});
