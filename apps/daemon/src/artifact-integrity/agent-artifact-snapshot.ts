import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
    AGENT_SNAPSHOT_DIRECTORY,
    AGENT_SNAPSHOT_FILE_MODE
} from "#src/artifact-integrity/agent-artifact-snapshot.const";
import type { AgentArtifactSnapshot } from "#src/artifact-integrity/agent-artifact-snapshot.types";
import {
    type ValidatedArtifact,
    validateFileArtifact
} from "#src/artifact-integrity/file-artifact";

/**
 * An autonomous agent runs its own experiments and keeps writing to its workspace afterwards, so a
 * declared artifact path is only a claim about a file that existed at some moment. The daemon copies
 * every declared file into a directory the agent's workspace does not contain, re-reads the copy, and
 * measures evidence against that copy alone. The evaluator input binding and the recorded evidence
 * hash therefore describe the snapshot, never the original the agent can still rewrite.
 */
export async function snapshotAgentArtifacts(
    runDirectory: string,
    workspaceDirectory: string,
    declaredPaths: readonly string[]
): Promise<AgentArtifactSnapshot> {
    const snapshotDirectory = path.join(
        runDirectory,
        AGENT_SNAPSHOT_DIRECTORY,
        `snapshot-${randomUUID()}`
    );
    await mkdir(snapshotDirectory, { recursive: true });
    const artifacts: ValidatedArtifact[] = [];
    const issues: string[] = [];
    for (const [index, declaredPath] of declaredPaths.entries()) {
        try {
            const declared = await validateFileArtifact(workspaceDirectory, declaredPath);
            if (declared.bytes === 0) {
                issues.push(`Rejected empty artifact ${declaredPath}`);
                continue;
            }
            const snapshotPath = path.join(
                snapshotDirectory,
                `artifact-${String(index).padStart(3, "0")}${path.extname(declared.path)}`
            );
            await writeFile(snapshotPath, await readFile(declared.path), {
                flag: "wx",
                mode: AGENT_SNAPSHOT_FILE_MODE
            });
            const snapshot = await validateFileArtifact(snapshotDirectory, snapshotPath);
            if (snapshot.sha256 !== declared.sha256 || snapshot.bytes !== declared.bytes) {
                issues.push(`Artifact changed while being snapshotted: ${declaredPath}`);
                continue;
            }
            artifacts.push(snapshot);
        } catch (error) {
            issues.push(
                `Rejected artifact ${declaredPath}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
    return { artifacts, issues };
}

/**
 * Re-hashes daemon-owned snapshots after they have crossed a boundary an agent could have reached,
 * so a verdict can never describe a file that changed between measurement and judgement.
 */
export async function assertArtifactsUnchanged(
    artifacts: readonly ValidatedArtifact[]
): Promise<void> {
    for (const artifact of artifacts) {
        const rehashed = await validateFileArtifact(path.dirname(artifact.path), artifact.path);
        if (rehashed.sha256 !== artifact.sha256 || rehashed.bytes !== artifact.bytes) {
            throw new Error(
                `Daemon artifact snapshot changed after it was taken: ${artifact.path}`
            );
        }
    }
}
