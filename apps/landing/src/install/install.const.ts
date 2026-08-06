/**
 * The three ways the lab is installed. These are the ids the page marks itself with once it knows
 * which shell a reader is on, so they are values a stylesheet and a script both read: keep them
 * lowercase and free of anything that needs escaping in an attribute selector.
 */
export const INSTALL_PLATFORM = {
    unix: "unix",
    powershell: "powershell",
    cmd: "cmd"
} as const;

export type InstallPlatform = (typeof INSTALL_PLATFORM)[keyof typeof INSTALL_PLATFORM];

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
} as const satisfies Record<InstallPlatform, string>;

/**
 * The prompt each shell actually writes before it takes a command. It is here so the line reads as
 * the shell a reader is standing in: a `$` in front of a PowerShell command is a small lie, and it
 * is the kind that makes someone paste the wrong thing.
 */
export const INSTALL_PROMPT = {
    unix: "$",
    powershell: "PS>",
    cmd: ">"
} as const satisfies Record<InstallPlatform, string>;

/** How each one is named on the control that switches between them. */
export const INSTALL_PLATFORM_LABEL = {
    unix: "macOS · Linux",
    powershell: "PowerShell",
    cmd: "cmd.exe"
} as const satisfies Record<InstallPlatform, string>;

/**
 * What is shown before a browser has told us anything, and what stays shown when scripting is off.
 * It is the Unix line because that installer covers two of the three platforms.
 */
export const DEFAULT_INSTALL_PLATFORM: InstallPlatform = INSTALL_PLATFORM.unix;
