/**
 * Where an installed lab keeps itself.
 *
 * The program and the lab it runs are deliberately kept apart. A lab is a directory an operator can
 * copy to keep or delete to be rid of, which only stays true while nothing of the program is inside
 * it. So the versions live under a home of their own, and `OPENLAB_HOME` stays what it says it is.
 */
export const InstalledLayout = {
    /** The program's home, holding every version ever installed. */
    HOME_DIRECTORY: ".openlab",
    /** One directory per version, each a whole release: the executable and what it reads. */
    VERSIONS_DIRECTORY: "versions",
    /** What was installed, where it was put, and what was changed to make it reachable. */
    RECEIPT_FILE: "install-receipt.json",
    /** Where the launcher goes when the operator names no directory of their own. */
    FALLBACK_BIN_DIRECTORY: ".local/bin"
} as const;

/**
 * The environment an operator can install through.
 *
 * `OPENLAB_INSTALL_DIR` is asked first because it is the one an operator sets on purpose;
 * `XDG_BIN_HOME` is the specification's answer for where a user's own executables belong.
 */
export const InstallEnvironment = {
    INSTALL_DIRECTORY: "OPENLAB_INSTALL_DIR",
    XDG_BIN_HOME: "XDG_BIN_HOME"
} as const;
