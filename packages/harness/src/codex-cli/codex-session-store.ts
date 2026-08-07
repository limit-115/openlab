import { join } from "node:path";
import { CodexSessionStore } from "#src/codex-cli/codex-cli.const";
import { dayPartitionEntries, sessionStoreRoot } from "#src/session-transcript/session-store-root";
import type { SessionStore } from "#src/session-transcript/session-transcript.types";

/**
 * Where the Codex CLI keeps a session: one rollout file per thread, filed under the day it started.
 *
 * The rollout is matched on the thread id the run already knows rather than on the timestamp in its
 * name. The CLI stamps that name when it opens the file and the lab stamps its own start moments
 * earlier, so a run begun on the turn of a day is filed under a date the lab would not have guessed.
 */
export function codexSessionStore(environment: Readonly<Record<string, string>>): SessionStore {
    const root = sessionStoreRoot(
        environment,
        CodexSessionStore.HOME_VARIABLE,
        CodexSessionStore.HOME_SEGMENTS
    );

    return {
        root,
        async locate(sessionId: string): Promise<readonly string[]> {
            const sessions = join(root, CodexSessionStore.SESSIONS_DIRECTORY);
            const suffix = `-${sessionId}${CodexSessionStore.ROLLOUT_SUFFIX}`;
            return (await dayPartitionEntries(sessions))
                .filter(
                    (entry) =>
                        entry.isFile() &&
                        entry.name.startsWith(CodexSessionStore.ROLLOUT_PREFIX) &&
                        entry.name.endsWith(suffix)
                )
                .map((entry) => join(entry.parentPath, entry.name));
        }
    };
}
