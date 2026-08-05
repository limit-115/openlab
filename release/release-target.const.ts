/**
 * The platforms a release is built for.
 *
 * Every one of them is cross-compiled from a single machine, which is why the list can be this
 * short a thing: a release does not need a runner per platform, only a name per platform.
 */
export const ReleaseTarget = {
    DARWIN_ARM64: "darwin-arm64",
    DARWIN_X64: "darwin-x64",
    LINUX_X64: "linux-x64",
    LINUX_ARM64: "linux-arm64",
    WINDOWS_X64: "windows-x64"
} as const;

export type ReleaseTarget = (typeof ReleaseTarget)[keyof typeof ReleaseTarget];

/** What Bun calls each platform when it is asked to compile for one. */
export const BunCompileTarget = {
    [ReleaseTarget.DARWIN_ARM64]: "bun-darwin-arm64",
    [ReleaseTarget.DARWIN_X64]: "bun-darwin-x64",
    [ReleaseTarget.LINUX_X64]: "bun-linux-x64",
    [ReleaseTarget.LINUX_ARM64]: "bun-linux-arm64",
    [ReleaseTarget.WINDOWS_X64]: "bun-windows-x64"
} as const satisfies Record<ReleaseTarget, string>;

/** The one platform whose executables carry a suffix and whose archives are read by Explorer. */
export const WINDOWS_TARGETS: readonly ReleaseTarget[] = [ReleaseTarget.WINDOWS_X64];

/** What the lab is called on disk once it is installed. */
export const EXECUTABLE_NAME = "openlab";
