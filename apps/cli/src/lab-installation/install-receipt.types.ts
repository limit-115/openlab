/**
 * What one installation did.
 *
 * An uninstall reads this rather than guessing: it is the only record of which directory the
 * launcher went into and which of the operator's startup files were written to, and guessing at
 * either means either leaving the lab half-installed or deleting something that was never ours.
 */
export interface InstallReceipt {
    readonly version: string;
    readonly installed_at: string;
    readonly version_directory: string;
    readonly launcher: string;
    /** The startup files a `PATH` block was written into, which is empty when none was needed. */
    readonly path_files: readonly string[];
}
