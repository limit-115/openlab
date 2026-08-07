import { describe, expect, it } from "vitest";
import { ReleaseManifestSchema } from "#src/release-channel/release-manifest.schema";
import { ReleaseTarget } from "#src/release-channel/release-target.const";

const ARTIFACT = {
    file: "openlab-0.1.0-linux-x64.tar.gz",
    sha256: "a".repeat(64),
    size: 27_000_000
};

describe("the manifest an installer reads before it downloads anything", () => {
    /** A release built for one platform is how a release is rehearsed, and it has a manifest. */
    it("accepts a release carrying only the targets it was built for", () => {
        const manifest = ReleaseManifestSchema.parse({
            version: "0.1.0",
            artifacts: { [ReleaseTarget.LINUX_X64]: ARTIFACT }
        });

        expect(manifest.artifacts[ReleaseTarget.LINUX_X64]?.file).toBe(ARTIFACT.file);
        expect(manifest.artifacts[ReleaseTarget.DARWIN_ARM64]).toBeUndefined();
    });

    /** The digest is the whole point of the manifest, so nothing that is not one may pass as one. */
    it("refuses a digest that is not a sha256", () => {
        for (const sha256 of ["", "abc", "A".repeat(64), `${"a".repeat(63)}z`]) {
            const parsed = ReleaseManifestSchema.safeParse({
                version: "0.1.0",
                artifacts: { [ReleaseTarget.LINUX_X64]: { ...ARTIFACT, sha256 } }
            });

            expect(parsed.success).toBe(false);
        }
    });

    it("refuses a target no release is built for", () => {
        const parsed = ReleaseManifestSchema.safeParse({
            version: "0.1.0",
            artifacts: { "linux-riscv64": ARTIFACT }
        });

        expect(parsed.success).toBe(false);
    });

    /**
     * A release may state more than an installed lab was built to read, and that lab still has to
     * be able to update itself off it.
     */
    it("drops a field it was not built to read instead of refusing the release", () => {
        const parsed = ReleaseManifestSchema.parse({
            version: "0.2.0",
            artifacts: { [ReleaseTarget.LINUX_X64]: ARTIFACT },
            signed_by: "a key this lab predates"
        });

        expect(parsed.version).toBe("0.2.0");
        expect(parsed).not.toHaveProperty("signed_by");
    });
});
