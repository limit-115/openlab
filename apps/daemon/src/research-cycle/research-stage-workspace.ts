import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { simpleGit } from "simple-git";
import type { ResearchStage } from "#src/research-cycle/research-stage-workspace.const";
import type {
    ResearchWorkspace,
    ResearchWorkspaceFactory
} from "#src/research-cycle/research-stage-workspace.types";

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
