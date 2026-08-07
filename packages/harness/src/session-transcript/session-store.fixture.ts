import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const storeRoots: string[] = [];

export async function sessionStoreRootDirectory(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), "lab-session-store-"));
    storeRoots.push(root);
    return root;
}

export async function removeSessionStores(): Promise<void> {
    await Promise.all(
        storeRoots.splice(0).map((path) => rm(path, { recursive: true, force: true }))
    );
}

/** Writes one file and every directory above it, so a test states a store as the paths it holds. */
export async function writeStoreFile(path: string, contents: string): Promise<string> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents, "utf8");
    return path;
}

/**
 * The layout the Claude CLI writes: the thread beside a directory of the same name whose `subagents`
 * hold one transcript per delegated agent. Taken from a real run rather than from documentation.
 */
export async function writeClaudeSession(
    root: string,
    project: string,
    sessionId: string
): Promise<void> {
    const projectDirectory = join(root, "projects", project);
    await writeStoreFile(join(projectDirectory, `${sessionId}.jsonl`), '{"type":"assistant"}\n');
    await writeStoreFile(
        join(projectDirectory, sessionId, "subagents", "agent-a1a332f77706ae0e6.jsonl"),
        '{"type":"assistant","isSidechain":true}\n'
    );
    await writeStoreFile(
        join(projectDirectory, sessionId, "subagents", "agent-a1a332f77706ae0e6.meta.json"),
        '{"agentType":"general-purpose","spawnDepth":1}\n'
    );
}

/** The layout the Codex CLI writes: one rollout file filed under the day the thread opened. */
export async function writeCodexRollout(
    root: string,
    day: readonly [string, string, string],
    sessionId: string
): Promise<string> {
    return writeStoreFile(
        join(root, "sessions", ...day, `rollout-2026-08-07T19-09-31-${sessionId}.jsonl`),
        '{"type":"thread.started"}\n'
    );
}

/**
 * The layout Muse Code writes: a directory per session holding the parent log and one transcript per
 * subagent. The subagent tree is the part that never reaches the stream the harness reads.
 */
export async function writeMuseSession(
    root: string,
    day: readonly [string, string, string],
    sessionId: string,
    subagentIds: readonly string[]
): Promise<string> {
    const sessionDirectory = join(root, "muse", "sessions", ...day, sessionId);
    await writeStoreFile(join(sessionDirectory, "session.jsonl"), '{"record_type":"event"}\n');
    for (const subagentId of subagentIds) {
        await writeStoreFile(
            join(sessionDirectory, "subagent", subagentId, "session.jsonl"),
            `{"subagent":"${subagentId}"}\n`
        );
    }
    return sessionDirectory;
}
