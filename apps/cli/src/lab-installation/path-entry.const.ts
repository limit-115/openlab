/**
 * How the lab writes itself into a shell's startup file.
 *
 * The block is fenced by markers so that installing twice replaces what the last install wrote
 * instead of appending to it, and so that uninstalling can take out exactly what was added and
 * nothing an operator put there themselves.
 */
export const PathEntryMarker = {
    OPENS: "# >>> NightLab installer >>>",
    CLOSES: "# <<< NightLab installer <<<"
} as const;

/**
 * The startup files a login shell reads.
 *
 * Several are written rather than one guessed at: an operator's shell is not knowable from inside a
 * process it did not start, and a line in a file that shell never reads costs nothing.
 */
export const ShellStartupFile = {
    PROFILE: ".profile",
    BASH_RC: ".bashrc",
    BASH_PROFILE: ".bash_profile",
    ZSH_RC: ".zshrc",
    ZSH_ENV: ".zshenv"
} as const;

export type ShellStartupFile = (typeof ShellStartupFile)[keyof typeof ShellStartupFile];

/** Fish keeps its startup fragments in a directory of their own rather than in one file. */
export const FISH_CONFIGURATION_FILE = ".config/fish/conf.d/openlab.fish";
