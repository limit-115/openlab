import { rm } from "node:fs/promises";
import path from "node:path";
import { readInstallReceipt } from "#src/lab-installation/install-receipt";
import { InstalledLayout } from "#src/lab-installation/installed-layout.const";
import { removeFromPath } from "#src/lab-installation/path-entry";

/** What an uninstall took away, so an operator is told rather than reassured. */
export interface UninstallOutcome {
    /** Nothing was installed here in the first place. */
    readonly wasInstalled: boolean;
    readonly removed: readonly string[];
    readonly pathFilesCleared: readonly string[];
    /** Where the lab's own data still is, which an uninstall never touches. */
    readonly labHome: string | undefined;
}

/**
 * Takes the program back out, and only the program.
 *
 * What was installed is read from the receipt rather than worked out again, because the second
 * answer can differ from the first — an operator may have moved their bin directory since — and a
 * guess here either strands a launcher on `PATH` or deletes a file that was never the lab's.
 *
 * A lab's investigations, database and run directories are not the program and are left where they
 * are. An operator who wants those gone deletes the home they live in, which is one directory.
 */
export async function uninstallLab(home: string, labHome?: string): Promise<UninstallOutcome> {
    const receipt = await readInstallReceipt(path.join(home, InstalledLayout.RECEIPT_FILE));
    if (receipt === undefined) {
        return { wasInstalled: false, removed: [], pathFilesCleared: [], labHome };
    }

    await rm(receipt.launcher, { force: true });
    await rm(home, { recursive: true, force: true });
    const pathFilesCleared = await removeFromPath();

    return {
        wasInstalled: true,
        removed: [receipt.launcher, home],
        pathFilesCleared,
        labHome
    };
}
