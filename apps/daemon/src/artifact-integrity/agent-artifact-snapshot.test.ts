import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { snapshotAgentArtifacts } from "#src/artifact-integrity/agent-artifact-snapshot";

async function agentWorkspace(): Promise<{ runDirectory: string; workspace: string }> {
    const runDirectory = await mkdtemp(path.join(tmpdir(), "lab-snapshot-run-"));
    const workspace = path.join(runDirectory, "workspaces", "researcher-000");
    await mkdir(workspace, { recursive: true });
    return { runDirectory, workspace };
}

describe("agent artifact snapshot", () => {
    it("measures the handed-over bytes even after the agent rewrites the original", async () => {
        const { runDirectory, workspace } = await agentWorkspace();
        const measurementPath = path.join(workspace, "measurement.json");
        await writeFile(measurementPath, '{"elapsed_ms":12}');

        const snapshot = await snapshotAgentArtifacts(runDirectory, workspace, [measurementPath]);
        await writeFile(measurementPath, '{"elapsed_ms":1}');

        const [artifact] = snapshot.artifacts;
        if (artifact === undefined) {
            throw new Error("Expected one snapshotted artifact");
        }
        expect(snapshot.issues).toEqual([]);
        expect(artifact.path.startsWith(`${workspace}${path.sep}`)).toBe(false);
        await expect(readFile(artifact.path, "utf8")).resolves.toBe('{"elapsed_ms":12}');
    });

    it("rejects an artifact that holds no bytes to measure", async () => {
        const { runDirectory, workspace } = await agentWorkspace();
        const emptyPath = path.join(workspace, "empty.json");
        await writeFile(emptyPath, "");

        const snapshot = await snapshotAgentArtifacts(runDirectory, workspace, [emptyPath]);

        expect(snapshot.artifacts).toEqual([]);
        expect(snapshot.issues).toEqual([expect.stringContaining("Rejected empty artifact")]);
    });
});
