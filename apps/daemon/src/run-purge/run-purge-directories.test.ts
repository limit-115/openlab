import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { writeCurrentPointer } from "#src/lab-workspace/lab-run-pointer";
import { WorkspaceLayout } from "#src/lab-workspace/lab-workspace.const";
import { listRunLabIds, purgeRunDirectories } from "#src/run-purge/run-purge-directories";

async function exists(target: string): Promise<boolean> {
    try {
        await access(target);
        return true;
    } catch {
        return false;
    }
}

async function createWorkspace(labIds: readonly string[]): Promise<string> {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-purge-test-"));
    for (const labId of labIds) {
        const runDirectory = path.join(workspaceRoot, WorkspaceLayout.RUNS_DIRECTORY, labId);
        await mkdir(runDirectory, { recursive: true });
        await writeFile(path.join(runDirectory, "report.md"), `Report for ${labId}`);
    }
    return workspaceRoot;
}

describe("purgeRunDirectories", () => {
    it("deletes every run directory when no run is kept", async () => {
        const workspaceRoot = await createWorkspace(["lab-one", "lab-two", "lab-three"]);

        const purged = await purgeRunDirectories({ workspaceRoot, keptLabId: undefined });

        expect(purged.toSorted()).toEqual(["lab-one", "lab-three", "lab-two"]);
        expect(await listRunLabIds(workspaceRoot)).toEqual([]);
    });

    it("leaves the kept run and its contents untouched", async () => {
        const workspaceRoot = await createWorkspace(["lab-one", "lab-two"]);

        const purged = await purgeRunDirectories({ workspaceRoot, keptLabId: "lab-two" });

        expect(purged).toEqual(["lab-one"]);
        expect(
            await exists(
                path.join(workspaceRoot, WorkspaceLayout.RUNS_DIRECTORY, "lab-two", "report.md")
            )
        ).toBe(true);
    });

    it("drops the current pointer only when nothing is kept", async () => {
        const workspaceRoot = await createWorkspace(["lab-one"]);
        const pointerPath = path.join(workspaceRoot, WorkspaceLayout.CURRENT_POINTER_FILE);
        await writeCurrentPointer(workspaceRoot, {
            lab_id: "lab-one",
            run_directory: path.join(workspaceRoot, WorkspaceLayout.RUNS_DIRECTORY, "lab-one")
        });

        await purgeRunDirectories({ workspaceRoot, keptLabId: "lab-one" });
        expect(await exists(pointerPath)).toBe(true);

        await purgeRunDirectories({ workspaceRoot, keptLabId: undefined });
        expect(await exists(pointerPath)).toBe(false);
    });

    it("keeps unrelated files that are not run directories", async () => {
        const workspaceRoot = await createWorkspace(["lab-one"]);
        const strayPath = path.join(workspaceRoot, WorkspaceLayout.RUNS_DIRECTORY, "notes.txt");
        await writeFile(strayPath, "not a run");

        const purged = await purgeRunDirectories({ workspaceRoot, keptLabId: undefined });

        expect(purged).toEqual(["lab-one"]);
        expect(await exists(strayPath)).toBe(true);
    });
});

describe("listRunLabIds", () => {
    it("reports no runs when the workspace has never been used", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-purge-empty-"));

        expect(await listRunLabIds(workspaceRoot)).toEqual([]);
    });
});
