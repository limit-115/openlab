import { ReleaseTarget } from "#src/release-channel/release-target.const";

/** What Node calls each processor a release is built for. */
const ARCHITECTURE = {
    arm64: "arm64",
    x64: "x64"
} as const;

/** Every platform and processor pair a release exists for, in the terms Node reports them in. */
const TARGET_BY_PLATFORM = {
    darwin: {
        [ARCHITECTURE.arm64]: ReleaseTarget.DARWIN_ARM64,
        [ARCHITECTURE.x64]: ReleaseTarget.DARWIN_X64
    },
    linux: {
        [ARCHITECTURE.arm64]: ReleaseTarget.LINUX_ARM64,
        [ARCHITECTURE.x64]: ReleaseTarget.LINUX_X64
    },
    win32: {
        [ARCHITECTURE.x64]: ReleaseTarget.WINDOWS_X64
    }
} as const satisfies Partial<Record<NodeJS.Platform, Partial<Record<string, ReleaseTarget>>>>;

/**
 * Which release this machine runs, or nothing when no release is built for it.
 *
 * A machine is asked what it is rather than what it could emulate. An Intel build on Apple Silicon
 * reports itself as x64 and stays on x64: the operator installed that build, and an update is not
 * the moment to move them to another processor's binary behind their back.
 *
 * Finding nothing is a platform the lab has no build for, and the caller has to say so rather than
 * download whatever happened to be listed first.
 */
export function currentReleaseTarget(
    platform: NodeJS.Platform = process.platform,
    architecture: string = process.arch
): ReleaseTarget | undefined {
    const architectures: Partial<Record<string, ReleaseTarget>> | undefined =
        TARGET_BY_PLATFORM[platform as keyof typeof TARGET_BY_PLATFORM];
    return architectures?.[architecture];
}
