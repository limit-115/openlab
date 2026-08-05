import path from "node:path";
import type {
    LabStorage,
    RunDirectoryUsage
} from "@openlab/protocol/lab-storage/lab-storage.types";
import type { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import { WorkspaceLayout } from "#src/investigation-workspace/investigation-workspace.const";
import { directoryUsage } from "#src/lab-storage/run-directory-usage";
import { listRunInvestigationIds, purgeRunDirectories } from "#src/run-purge/run-purge-directories";

/**
 * What the lab takes up on disk. Disk is what is asked, not the roster: a run directory left behind
 * by an investigation the lab no longer holds still costs the operator space, and a purge still
 * takes it, so it is reported beside the rest with no goal against its name.
 */
export async function readLabStorage(
    workspaceRoot: string,
    registry: InvestigationRegistry
): Promise<LabStorage> {
    const root = path.resolve(workspaceRoot);
    const runsRoot = path.join(root, WorkspaceLayout.RUNS_DIRECTORY);
    const investigationIds = await listRunInvestigationIds(root);

    const runs = await Promise.all(
        investigationIds.sort().map(async (investigationId): Promise<RunDirectoryUsage> => {
            const directory = path.join(runsRoot, investigationId);
            const usage = await directoryUsage(directory);
            return {
                investigation_id: investigationId,
                goal:
                    registry.get(investigationId)?.workspace.getSnapshot().investigation.goal ??
                    null,
                path: directory,
                bytes: usage.bytes,
                file_count: usage.fileCount
            };
        })
    );

    return {
        workspace_root: root,
        bytes: runs.reduce((total, run) => total + run.bytes, 0),
        runs
    };
}

/**
 * Empties the lab. Every investigation goes through the registry, so its loop is cancelled and its
 * agents stop before its rows and its directory are deleted; whatever is left on disk afterwards
 * belonged to no investigation the lab was holding, and goes too.
 */
export async function purgeLabStorage(
    workspaceRoot: string,
    registry: InvestigationRegistry
): Promise<LabStorage> {
    for (const { id } of registry.list()) {
        await registry.remove(id);
    }
    await purgeRunDirectories({ workspaceRoot });
    return readLabStorage(workspaceRoot, registry);
}
