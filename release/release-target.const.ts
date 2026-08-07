import { ReleaseTarget } from "@openlab/core/release-channel/release-target.const";

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
