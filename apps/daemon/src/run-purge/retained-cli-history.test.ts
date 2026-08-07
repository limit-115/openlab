import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { retainedCliHistory } from "#src/run-purge/retained-cli-history";

const roots: string[] = [];

afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function machineRoot(): Promise<string> {
    const root = await mkdtemp(path.join(tmpdir(), "lab-cli-history-"));
    roots.push(root);
    return root;
}

describe("retainedCliHistory", () => {
    it("names the stores that are there and stays quiet about the ones that are not", async () => {
        const root = await machineRoot();
        await mkdir(path.join(root, ".claude"), { recursive: true });
        await mkdir(path.join(root, ".local", "share", "muse"), { recursive: true });

        await expect(retainedCliHistory({ HOME: root })).resolves.toEqual([
            path.join(root, ".claude"),
            path.join(root, ".local", "share", "muse")
        ]);
    });

    /**
     * A CLI pointed somewhere by its own variable keeps its history there, and an operator told to
     * look under a home the CLI never wrote to would go and find nothing.
     */
    it("follows a store the operator moved with the CLI's own variable", async () => {
        const root = await machineRoot();
        const moved = path.join(root, "elsewhere", "codex");
        await mkdir(moved, { recursive: true });
        await mkdir(path.join(root, ".codex"), { recursive: true });

        await expect(retainedCliHistory({ HOME: root, CODEX_HOME: moved })).resolves.toEqual([
            moved
        ]);
    });

    it("reports nothing on a machine where no agent CLI has ever run", async () => {
        await expect(retainedCliHistory({ HOME: await machineRoot() })).resolves.toEqual([]);
    });
});
