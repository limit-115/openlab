import { randomUUID } from "node:crypto";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { simpleGit } from "simple-git";
import {
    CleanWorkspaceEntry,
    type ResearchStage
} from "#src/research-cycle/research-stage-workspace.const";
import type {
    ResearchWorkspace,
    ResearchWorkspaceFactory
} from "#src/research-cycle/research-stage-workspace.types";

/**
 * An autonomous agent owns everything its workspace ends up holding, which only means anything if the
 * workspace was empty when it started. A leftover file would otherwise be indistinguishable from an
 * artifact the agent produced.
 */
export async function assertCleanAgentWorkspace(workspace: ResearchWorkspace): Promise<void> {
    const unexpectedEntries = (await readdir(workspace.cwd)).filter(
        (entry) => entry !== CleanWorkspaceEntry.GIT
    );
    if (unexpectedEntries.length > 0) {
        throw new Error(`Agent workspace is not clean: ${unexpectedEntries.sort().join(", ")}`);
    }
}

export class GitResearchWorkspaceFactory implements ResearchWorkspaceFactory {
    readonly #cycleDirectory: string;

    constructor(runDirectory: string, cycleId: string = randomUUID()) {
        this.#cycleDirectory = path.join(runDirectory, "workspaces", `cycle-${cycleId}`);
    }

    async create(stage: ResearchStage, ordinal: number): Promise<ResearchWorkspace> {
        if (!Number.isSafeInteger(ordinal) || ordinal < 0) {
            throw new RangeError("Research workspace ordinal must be a non-negative safe integer");
        }

        await mkdir(this.#cycleDirectory, { recursive: true });
        const id = `${stage}-${String(ordinal).padStart(3, "0")}`;
        const cwd = path.join(this.#cycleDirectory, id);
        await mkdir(cwd);
        const git = simpleGit(cwd);
        await git.init();
        await git.addConfig("user.name", "AI Research Lab", false, "local");
        await git.addConfig("user.email", "lab@localhost", false, "local");

        return {
            id,
            stage,
            cwd,
            artifactDirectory: path.join(cwd, ".lab-artifacts", `run-${randomUUID()}`)
        };
    }
}
