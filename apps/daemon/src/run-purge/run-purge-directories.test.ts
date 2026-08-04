import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { writeCurrentPointer } from "#src/investigation-workspace/investigation-run-pointer";
import { WorkspaceLayout } from "#src/investigation-workspace/investigation-workspace.const";
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
        await writeFile(path.join(runDirectory, "report.md"), `Report for ${investigationId}`);
    }
    return workspaceRoot;
}

describe("purgeRunDirectories", () => {
    it("deletes every run directory when no run is kept", async () => {
        const workspaceRoot = await createWorkspace([
            "investigation-one",
            "investigation-two",
            "investigation-three"
        ]);

        const purged = await purgeRunDirectories({ workspaceRoot, keptInvestigationId: undefined });

        expect(purged.toSorted()).toEqual([
            "investigation-one",
            "investigation-three",
            "investigation-two"
        ]);
        expect(await listRunInvestigationIds(workspaceRoot)).toEqual([]);
    });

    it("leaves the kept run and its contents untouched", async () => {
        const workspaceRoot = await createWorkspace(["investigation-one", "investigation-two"]);

        const purged = await purgeRunDirectories({
            workspaceRoot,
            keptInvestigationId: "investigation-two"
        });

        expect(purged).toEqual(["investigation-one"]);
        expect(
            await exists(
                path.join(
                    workspaceRoot,
                    WorkspaceLayout.RUNS_DIRECTORY,
                    "investigation-two",
                    "report.md"
                )
            )
        ).toBe(true);
    });

    it("drops the current pointer only when nothing is kept", async () => {
        const workspaceRoot = await createWorkspace(["investigation-one"]);
        const pointerPath = path.join(workspaceRoot, WorkspaceLayout.CURRENT_POINTER_FILE);
        await writeCurrentPointer(workspaceRoot, {
            investigation_id: "investigation-one",
            run_directory: path.join(
                workspaceRoot,
                WorkspaceLayout.RUNS_DIRECTORY,
                "investigation-one"
            )
        });

        await purgeRunDirectories({ workspaceRoot, keptInvestigationId: "investigation-one" });
        expect(await exists(pointerPath)).toBe(true);

        await purgeRunDirectories({ workspaceRoot, keptInvestigationId: undefined });
        expect(await exists(pointerPath)).toBe(false);
    });

    it("keeps unrelated files that are not run directories", async () => {
        const workspaceRoot = await createWorkspace(["investigation-one"]);
        const strayPath = path.join(workspaceRoot, WorkspaceLayout.RUNS_DIRECTORY, "notes.txt");
        await writeFile(strayPath, "not a run");

        const purged = await purgeRunDirectories({ workspaceRoot, keptInvestigationId: undefined });

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
