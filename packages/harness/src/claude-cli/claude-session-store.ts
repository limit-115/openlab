import { join } from "node:path";
import { ClaudeSessionStore } from "#src/claude-cli/claude-cli.const";
import { directoryEntries, sessionStoreRoot } from "#src/session-transcript/session-store-root";
import type { SessionStore } from "#src/session-transcript/session-transcript.types";

/**
 * Where the Claude CLI keeps a session: one JSONL of the thread the lab watched on stdout, and
 * beside it a directory holding one transcript per subagent. The subagent files are why this exists.
 * A delegated agent's whole working record — what it was asked, what it read, what it ran — is
 * written there and reaches the stream only in part, and which part differs from one run to the next.
 *
 * The session is found by scanning the project directories rather than by deriving the one the CLI
 * would have chosen from the run's own working directory. That derivation is a rule of the CLI's
 * making, and the day it changes a lab built on it would quietly stop collecting; a session id is
 * something the run was told, and cannot go stale.
 */
export function claudeSessionStore(environment: Readonly<Record<string, string>>): SessionStore {
    const root = sessionStoreRoot(
        environment,
        ClaudeSessionStore.HOME_VARIABLE,
        ClaudeSessionStore.HOME_SEGMENTS
    );

    return {
        root,
        async locate(sessionId: string): Promise<readonly string[]> {
            const projects = join(root, ClaudeSessionStore.PROJECTS_DIRECTORY);
            const transcript = `${sessionId}${ClaudeSessionStore.TRANSCRIPT_SUFFIX}`;
            const located: string[] = [];
            for (const project of await directoryEntries(projects)) {
                if (!project.isDirectory()) {
                    continue;
                }
                for (const entry of await directoryEntries(join(projects, project.name))) {
                    if (entry.name === transcript || entry.name === sessionId) {
                        located.push(join(projects, project.name, entry.name));
                    }
                }
            }
            return located;
        }
    };
}
