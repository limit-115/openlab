import type { ReleaseTarget } from "#release/release-target.const";

/** One platform's archive, and the digest an installer refuses to go on without. */
export interface ReleaseArtifact {
    readonly file: string;
    readonly sha256: string;
    readonly size: number;
}

/**
 * What an installer reads before it downloads anything.
 *
 * The manifest is fetched from the release first and names every artifact by platform along with
 * its digest, so the thing being verified and the thing stating what it should be are two separate
 * fetches rather than one file vouching for itself.
 */
export interface ReleaseManifest {
    readonly version: string;
    readonly artifacts: Readonly<Partial<Record<ReleaseTarget, ReleaseArtifact>>>;
}
