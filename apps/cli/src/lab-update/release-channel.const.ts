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

/** What a lab that was never installed has to be told, because an update cannot install one. */
export const INSTALL_COMMAND = "curl -fsSL https://openlab.bot/install.sh | sh";
