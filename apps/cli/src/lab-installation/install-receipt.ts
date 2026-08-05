import { readFile } from "node:fs/promises";
import writeFileAtomic from "write-file-atomic";
import type { InstallReceipt } from "#src/lab-installation/install-receipt.types";

/** Records what an installation did, where an uninstall will look for it. */
export async function writeInstallReceipt(file: string, receipt: InstallReceipt): Promise<void> {
    await writeFileAtomic(file, `${JSON.stringify(receipt, null, 4)}\n`);
}

/** What the last installation did, or nothing at all when this lab was never installed. */
export async function readInstallReceipt(file: string): Promise<InstallReceipt | undefined> {
    try {
        return JSON.parse(await readFile(file, "utf8")) as InstallReceipt;
    } catch {
        return undefined;
    }
}
