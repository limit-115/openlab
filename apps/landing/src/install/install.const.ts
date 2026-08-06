/**
 * What a reader is asked to paste. These are the commands `release/install.sh`, `install.ps1` and
 * `install.cmd` are reached by, so they state the same host the installer reads its downloads
 * from. A command that drifts from those files sends an operator to a URL that answers nothing,
 * which is the one failure this page cannot recover from — so they are stated once, here.
 */
export const INSTALL_COMMAND = {
    unix: "curl -fsSL https://openlab.bot/install.sh | sh",
    powershell: "irm https://openlab.bot/install.ps1 | iex",
    cmd: "curl -fsSL https://openlab.bot/install.cmd -o install.cmd && install.cmd && del install.cmd"
} as const;

export type InstallPlatform = keyof typeof INSTALL_COMMAND;

/** How each command is labelled for a reader deciding which line is theirs. */
export const INSTALL_PLATFORM_NAME = {
    unix: "macOS and Linux",
    powershell: "Windows PowerShell",
    cmd: "Windows command prompt"
} as const satisfies Record<InstallPlatform, string>;
