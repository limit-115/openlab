import { join } from "node:path";
import { MuseSessionStore } from "#src/muse-cli/muse-cli.const";
import { dayPartitionEntries, sessionStoreRoot } from "#src/session-transcript/session-store-root";
import type { SessionStore } from "#src/session-transcript/session-transcript.types";

/**
 * Where Muse Code keeps a session: a directory of its own, filed under the day it started, holding
 * the parent thread's log, the outputs its tools produced, and one transcript per subagent.
 *
 * This is the store the lab loses the most by not reading. A Muse run delegates freely, and the
 * subagents' transcripts are not a footnote to the session — they are routinely larger than the
 * parent log the harness watched on stdout, and none of them appears on it.
 */
export function museSessionStore(environment: Readonly<Record<string, string>>): SessionStore {
    const root = join(
        sessionStoreRoot(
            environment,
            MuseSessionStore.HOME_VARIABLE,
            MuseSessionStore.HOME_SEGMENTS
        ),
        MuseSessionStore.ROOT_DIRECTORY
    );

    return {
        root,
        async locate(sessionId: string): Promise<readonly string[]> {
            const sessions = join(root, MuseSessionStore.SESSIONS_DIRECTORY);
            return (await dayPartitionEntries(sessions))
                .filter((entry) => entry.isDirectory() && entry.name === sessionId)
                .map((entry) => join(entry.parentPath, entry.name));
        }
    };
}
