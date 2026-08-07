import manifest from "#package.json" with { type: "json" };

/**
 * What this build of the lab is.
 *
 * The manifest is where a version is written down once: the release is built from it, the tag that
 * publishes a release is checked against it, and every archive is named after it. Reading it here
 * rather than repeating it is what stops a lab from answering `--version` with one number while
 * installing itself into a directory named after another — a difference an update would then
 * compare against the channel and get wrong in both directions.
 */
export const LAB_VERSION: string = manifest.version;
