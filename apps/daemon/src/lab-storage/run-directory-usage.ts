import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { DirectoryUsage } from "#src/lab-storage/lab-storage.types";

/**
 * What one directory takes up, counted by walking it. A directory that vanishes underneath the walk
 * reports nothing rather than failing the reading: run directories are removed while the lab is
 * open, and a missing one is not a reason to refuse the total it belonged to.
 */
export async function directoryUsage(directory: string): Promise<DirectoryUsage> {
    const files = await listFiles(directory);
    const sizes = await Promise.all(
        files.map(async (entry) => {
            try {
                return (await stat(path.join(entry.parentPath, entry.name))).size;
            } catch {
                return 0;
            }
        })
    );

    return {
        bytes: sizes.reduce((total, size) => total + size, 0),
        fileCount: files.length
    };
}

async function listFiles(directory: string) {
    try {
        const entries = await readdir(directory, { withFileTypes: true, recursive: true });
        return entries.filter((entry) => entry.isFile());
    } catch {
        return [];
    }
}
