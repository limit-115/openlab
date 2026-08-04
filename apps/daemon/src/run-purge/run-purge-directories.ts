import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { resolveRunDirectory } from "#src/investigation-workspace/investigation-run-pointer";
import { WorkspaceLayout } from "#src/investigation-workspace/investigation-workspace.const";
import type { PurgeDirectoriesInput } from "#src/run-purge/run-purge.types";

function isMissingEntry(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function listRunInvestigationIds(workspaceRoot: string): Promise<string[]> {
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
    const investigationIds = (await listRunInvestigationIds(workspaceRoot)).filter(
        (investigationId) => investigationId !== input.keptInvestigationId
    );
    for (const investigationId of investigationIds) {
        const runDirectory = resolveRunDirectory(
            workspaceRoot,
            path.join(runsRoot, investigationId)
        );
        await rm(runDirectory, { recursive: true, force: true });
    }
    if (input.keptInvestigationId === undefined) {
        await rm(path.join(workspaceRoot, WorkspaceLayout.CURRENT_POINTER_FILE), { force: true });
    }
    return investigationIds;
}
