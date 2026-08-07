import { describe, expect, it } from "vitest";
import { currentReleaseTarget } from "#src/release-channel/release-target";
import { ReleaseTarget } from "#src/release-channel/release-target.const";

describe("which release a machine runs", () => {
    it("names the target for every platform a release is built for", () => {
        expect(currentReleaseTarget("darwin", "arm64")).toBe(ReleaseTarget.DARWIN_ARM64);
        expect(currentReleaseTarget("darwin", "x64")).toBe(ReleaseTarget.DARWIN_X64);
        expect(currentReleaseTarget("linux", "arm64")).toBe(ReleaseTarget.LINUX_ARM64);
        expect(currentReleaseTarget("linux", "x64")).toBe(ReleaseTarget.LINUX_X64);
        expect(currentReleaseTarget("win32", "x64")).toBe(ReleaseTarget.WINDOWS_X64);
    });

    /** Answering with a target the release has no build for would download the wrong machine's lab. */
    it("names nothing for a platform no release is built for", () => {
        expect(currentReleaseTarget("freebsd", "x64")).toBeUndefined();
        expect(currentReleaseTarget("win32", "arm64")).toBeUndefined();
        expect(currentReleaseTarget("linux", "s390x")).toBeUndefined();
    });

    /** An update keeps the operator on the build they installed rather than moving processor. */
    it("keeps an Intel build on Apple Silicon on the Intel target", () => {
        expect(currentReleaseTarget("darwin", "x64")).toBe(ReleaseTarget.DARWIN_X64);
    });
});
