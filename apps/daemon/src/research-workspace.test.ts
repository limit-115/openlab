import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { simpleGit } from "simple-git";
import { describe, expect, it } from "vitest";
import { GitResearchWorkspaceFactory, ResearchStage } from "#src/research-workspace";

describe("GitResearchWorkspaceFactory", () => {
    it("creates clean isolated Git repositories for every agent session", async () => {
        const runDirectory = await mkdtemp(path.join(tmpdir(), "lab-research-workspaces-"));
        const factory = new GitResearchWorkspaceFactory(runDirectory, "test-cycle");

        const researcher = await factory.create(ResearchStage.RESEARCHER, 0);
        const verifier = await factory.create(ResearchStage.VERIFIER, 0);

        expect(researcher.cwd).not.toBe(verifier.cwd);
        await expect(simpleGit(researcher.cwd).checkIsRepo()).resolves.toBe(true);
        await expect(simpleGit(verifier.cwd).checkIsRepo()).resolves.toBe(true);
        expect((await simpleGit(verifier.cwd).status()).isClean()).toBe(true);
    });
});
