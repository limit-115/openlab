import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { AgentRole } from "@openlab/protocol/agents/agent-role.const";
import type {
    AgentWorkspace,
    AgentWorkspaceFactory
} from "#src/research-cycle/agent-workspace.types";

/**
 * Gives every agent a directory of its own. This is not a sandbox and nothing stops an agent from
 * working outside it — parallel researchers simply need somewhere to build that is not each other's.
 */
export class RunDirectoryWorkspaceFactory implements AgentWorkspaceFactory {
    readonly #cycleDirectory: string;

    constructor(runDirectory: string, cycleId: string = randomUUID()) {
        this.#cycleDirectory = path.join(runDirectory, "workspaces", `cycle-${cycleId}`);
    }

    async create(role: AgentRole, ordinal: number): Promise<AgentWorkspace> {
        if (!Number.isSafeInteger(ordinal) || ordinal < 0) {
            throw new RangeError("Agent workspace ordinal must be a non-negative safe integer");
        }

        const id = `${role}-${String(ordinal).padStart(3, "0")}`;
        const cwd = path.join(this.#cycleDirectory, id);
        await mkdir(cwd, { recursive: true });

        return {
            id,
            role,
            cwd,
            artifactDirectory: path.join(cwd, ".openlab-artifacts", `run-${randomUUID()}`)
        };
    }
}
