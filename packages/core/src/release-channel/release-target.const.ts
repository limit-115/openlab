/**
 * The platforms a release is built for.
 *
 * Every one of them is cross-compiled from a single machine, which is why the list can be this
 * short a thing: a release does not need a runner per platform, only a name per platform.
 *
 * Two programs depend on these names agreeing. The build names one archive per target, and an
 * update looks its own platform up among them. A target added on one side alone is a platform that
 * gets releases and never gets an update, which is why the names live here rather than twice.
 */
export const ReleaseTarget = {
    DARWIN_ARM64: "darwin-arm64",
    DARWIN_X64: "darwin-x64",
    LINUX_X64: "linux-x64",
    LINUX_ARM64: "linux-arm64",
    WINDOWS_X64: "windows-x64"
} as const;

export type ReleaseTarget = (typeof ReleaseTarget)[keyof typeof ReleaseTarget];

/** What the lab is called on disk once it is installed. */
export const EXECUTABLE_NAME = "openlab";
