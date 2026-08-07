import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { claudeSessionStore } from "#src/claude-cli/claude-session-store";
import { codexSessionStore } from "#src/codex-cli/codex-session-store";
import { museSessionStore } from "#src/muse-cli/muse-session-store";
import {
    removeSessionStores,
    sessionStoreRootDirectory,
    writeClaudeSession,
    writeCodexRollout,
    writeMuseSession
} from "#src/session-transcript/session-store.fixture";

afterEach(removeSessionStores);

const DAY = ["2026", "08", "07"] as const;

describe("claude session store", () => {
    it("finds a session under whichever project directory the CLI chose", async () => {
        const root = await sessionStoreRootDirectory();
        await writeClaudeSession(root, "-home-operator-elsewhere", "other-session");
        await writeClaudeSession(root, "-openlab-workspaces-cycle-1-researcher-000", "wanted");

        const located = await claudeSessionStore({ CLAUDE_CONFIG_DIR: root }).locate("wanted");

        expect([...located].sort()).toEqual([
            join(root, "projects", "-openlab-workspaces-cycle-1-researcher-000", "wanted"),
            join(root, "projects", "-openlab-workspaces-cycle-1-researcher-000", "wanted.jsonl")
        ]);
    });

    it("resolves its root under HOME when the CLI was given no config directory", async () => {
        const home = await sessionStoreRootDirectory();

        expect(claudeSessionStore({ HOME: home }).root).toBe(join(home, ".claude"));
    });

    it("yields nothing for a session the CLI never recorded", async () => {
        const root = await sessionStoreRootDirectory();
        await writeClaudeSession(root, "-openlab-run", "recorded");

        await expect(
            claudeSessionStore({ CLAUDE_CONFIG_DIR: root }).locate("never-ran")
        ).resolves.toEqual([]);
    });
});

describe("codex session store", () => {
    it("finds a rollout by thread id rather than by the date in its name", async () => {
        const root = await sessionStoreRootDirectory();
        await writeCodexRollout(root, ["2026", "08", "06"], "yesterdays-thread");
        const wanted = await writeCodexRollout(root, DAY, "wanted-thread");

        await expect(
            codexSessionStore({ CODEX_HOME: root }).locate("wanted-thread")
        ).resolves.toEqual([wanted]);
    });

    it("resolves its root under HOME when the CLI was given no home of its own", async () => {
        const home = await sessionStoreRootDirectory();

        expect(codexSessionStore({ HOME: home }).root).toBe(join(home, ".codex"));
    });
});

describe("muse session store", () => {
    it("finds the session directory holding every subagent transcript", async () => {
        const root = await sessionStoreRootDirectory();
        const wanted = await writeMuseSession(root, DAY, "wanted-session", ["sub-a", "sub-b"]);
        await writeMuseSession(root, DAY, "other-session", ["sub-c"]);

        await expect(
            museSessionStore({ XDG_DATA_HOME: root }).locate("wanted-session")
        ).resolves.toEqual([wanted]);
    });

    /**
     * A session directory holds a subagent tree that can run to tens of thousands of files. The walk
     * stops at the day directory, so a name below one is another session's contents rather than a
     * session of its own — and is not read at all on the way past.
     */
    it("does not take a name from inside another session for a session", async () => {
        const root = await sessionStoreRootDirectory();
        await writeMuseSession(root, DAY, "host-session", ["buried"]);

        await expect(museSessionStore({ XDG_DATA_HOME: root }).locate("buried")).resolves.toEqual(
            []
        );
    });

    it("resolves its root under the XDG default when the environment names none", async () => {
        const home = await sessionStoreRootDirectory();

        expect(museSessionStore({ HOME: home }).root).toBe(join(home, ".local", "share", "muse"));
    });
});
