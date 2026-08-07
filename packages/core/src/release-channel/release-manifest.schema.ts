import { z } from "zod";
import { ReleaseTarget } from "#src/release-channel/release-target.const";

/** A digest is the whole point of the manifest, so a malformed one is not a manifest. */
const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

/** One platform's archive, and the digest an installer refuses to go on without. */
export const ReleaseArtifactSchema = z.object({
    file: z.string().min(1),
    sha256: Sha256Schema,
    size: z.number().int().positive()
});

/**
 * What an installer reads before it downloads anything.
 *
 * The manifest is fetched from the release first and names every artifact by platform along with
 * its digest, so the thing being verified and the thing stating what it should be are two separate
 * fetches rather than one file vouching for itself.
 *
 * The build writes through this schema and every updater reads through it, which is what makes a
 * manifest an updater could not parse a manifest that cannot be published. Unknown fields are
 * dropped rather than refused: a release may state more than an installed lab was built to read,
 * and that lab still has to be able to update itself off it.
 *
 * A release carries only the targets its build was asked for, so the artifacts are partial. Asking
 * for one platform is how a release is rehearsed, and that rehearsal has to produce a manifest.
 */
export const ReleaseManifestSchema = z.object({
    version: z.string().min(1),
    artifacts: z.partialRecord(z.enum(ReleaseTarget), ReleaseArtifactSchema)
});
