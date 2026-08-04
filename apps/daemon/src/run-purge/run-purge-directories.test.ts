import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    WorkspaceFile,
    WorkspaceLayout
} from "#src/investigation-workspace/investigation-workspace.const";
import { listRunInvestigationIds, purgeRunDirectories } from "#src/run-purge/run-purge-directories";

async function exists(target: string): Promise<boolean> {
    try {
        await access(target);
        return true;
    } catch {
        return false;
    }
}

async function createWorkspace(investigationIds: readonly string[]): Promise<string> {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-purge-test-"));
    for (const investigationId of investigationIds) {
        const runDirectory = path.join(
            workspaceRoot,
            WorkspaceLayout.RUNS_DIRECTORY,
            investigationId
        );
        await mkdir(runDirectory, { recursive: true });
        await writeFile(
            path.join(runDirectory, WorkspaceFile.REPORT),
            `Report for ${investigationId}`
        );
    }
    return workspaceRoot;
}

describe("purgeRunDirectories", () => {
    it("deletes every run directory", async () => {
        const workspaceRoot = await createWorkspace([
            "investigation-one",
            "investigation-two",
            "investigation-three"
        ]);

        const purged = await purgeRunDirectories({ workspaceRoot });

        expect(purged.toSorted()).toEqual([
            "investigation-one",
            "investigation-three",
            "investigation-two"
        ]);
        expect(await listRunInvestigationIds(workspaceRoot)).toEqual([]);
    });

    it("keeps unrelated files that are not run directories", async () => {
        const workspaceRoot = await createWorkspace(["investigation-one"]);
        const strayPath = path.join(workspaceRoot, WorkspaceLayout.RUNS_DIRECTORY, "notes.txt");
        await writeFile(strayPath, "not a run");

        const purged = await purgeRunDirectories({ workspaceRoot });

        expect(purged).toEqual(["investigation-one"]);
        expect(await exists(strayPath)).toBe(true);
    });
});

describe("listRunInvestigationIds", () => {
    it("reports no runs when the workspace has never been used", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-purge-empty-"));

        expect(await listRunInvestigationIds(workspaceRoot)).toEqual([]);
    });
});
