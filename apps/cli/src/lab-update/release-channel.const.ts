/** How an operator points the lab at somewhere other than where its releases are published. */
export const UpdateEnvironment = {
    RELEASES_URL: "OPENLAB_RELEASES_URL"
} as const;

/**
 * Where releases are published.
 *
 * This is the variable and the default the bootstrap installer already reads, so an operator who
 * mirrors releases states it once and both the first install and every update after it follow.
 */
export const DEFAULT_RELEASES_URL = "https://github.com/dibenkobit/openlab/releases";

/** The file every install and every update reads before it downloads anything. */
export const MANIFEST_FILE = "manifest.json";

/**
 * How long an operator waits on the channel before being told it could not be reached.
 *
 * The manifest is a few hundred bytes, so anything slower than this is a channel that is not
 * answering rather than one that is being thorough, and saying so beats waiting on it silently.
 */
export const MANIFEST_TIMEOUT_MS = 10_000;

/** What a lab that was never installed has to be told, because an update cannot install one. */
export const INSTALL_COMMAND = "curl -fsSL https://openlab.bot/install.sh | sh";
