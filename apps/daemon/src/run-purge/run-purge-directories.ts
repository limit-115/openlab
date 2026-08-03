import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { resolveRunDirectory } from "#src/lab-workspace/lab-run-pointer";
import { WorkspaceLayout } from "#src/lab-workspace/lab-workspace.const";
import type { PurgeDirectoriesInput } from "#src/run-purge/run-purge.types";

function isMissingEntry(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function listRunLabIds(workspaceRoot: string): Promise<string[]> {
    const runsRoot = path.join(path.resolve(workspaceRoot), WorkspaceLayout.RUNS_DIRECTORY);
    try {
        const entries = await readdir(runsRoot, { withFileTypes: true });
        return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch (error) {
        if (isMissingEntry(error)) {
            return [];
        }
        throw error;
    }
}

export async function purgeRunDirectories(input: PurgeDirectoriesInput): Promise<string[]> {
    const workspaceRoot = path.resolve(input.workspaceRoot);
    const runsRoot = path.join(workspaceRoot, WorkspaceLayout.RUNS_DIRECTORY);
    const labIds = (await listRunLabIds(workspaceRoot)).filter(
        (labId) => labId !== input.keptLabId
    );
    for (const labId of labIds) {
        const runDirectory = resolveRunDirectory(workspaceRoot, path.join(runsRoot, labId));
        await rm(runDirectory, { recursive: true, force: true });
    }
    if (input.keptLabId === undefined) {
        await rm(path.join(workspaceRoot, WorkspaceLayout.CURRENT_POINTER_FILE), { force: true });
    }
    return labIds;
}
