import { stat } from "node:fs/promises";
import { claudeSessionStore } from "@openlab/harness/claude-session-store";
import { codexSessionStore } from "@openlab/harness/codex-session-store";
import { museSessionStore } from "@openlab/harness/muse-session-store";
import type { SessionStore } from "@openlab/harness/session-transcript.types";

/**
 * The CLI session stores a purge leaves standing, and where they are.
 *
 * A lab is a directory: copy it to keep it, delete it to be rid of it. That is true of the lab and
 * not of the machine around it. Every agent the lab dispatched left the CLI's own account of the
 * work in the CLI's history, and the lab's copy of it — the one a purge does delete — was only ever
 * a copy. The originals are the CLI's, kept in the same store as the operator's own interactive
 * sessions, and deleting somebody else's history is not a purge's business. Saying where they are
 * is, because an operator emptying a lab to be rid of what it read has not finished when it ends.
 */
export async function retainedCliHistory(
    environment: Readonly<NodeJS.ProcessEnv>
): Promise<readonly string[]> {
    const named = definedVariables(environment);
    const stores: readonly SessionStore[] = [
        claudeSessionStore(named),
        codexSessionStore(named),
        museSessionStore(named)
    ];
    const roots = await Promise.all(
        stores.map(async (store) => ((await isDirectory(store.root)) ? store.root : undefined))
    );
    return [...new Set(roots.filter((root) => root !== undefined))].sort();
}

function definedVariables(environment: Readonly<NodeJS.ProcessEnv>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(environment).filter(
            (entry): entry is [string, string] => entry[1] !== undefined
        )
    );
}

async function isDirectory(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}
