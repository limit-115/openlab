import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { claudeSessionStore } from "#src/claude-cli/claude-session-store";
import { museSessionStore } from "#src/muse-cli/muse-session-store";
import {
    removeSessionStores,
    sessionStoreRootDirectory,
    writeClaudeSession,
    writeMuseSession
} from "#src/session-transcript/session-store.fixture";
import { collectSessionTranscript } from "#src/session-transcript/session-transcript";
import {
    SESSION_TRANSCRIPT_DIRECTORY,
    SessionTranscriptGaps
} from "#src/session-transcript/session-transcript.const";
import type { SessionStore } from "#src/session-transcript/session-transcript.types";
import { HARNESS_ARTIFACT_FILE_MODE } from "#src/subscription-cli-harness/harness-run-artifacts.const";

afterEach(removeSessionStores);

const DAY = ["2026", "08", "07"] as const;

/** The digest of `{"subagent":"sub-b"}\n`, so a copied byte that changed would fail this. */
const SUB_B_SHA256 = "d1636ad710d43e5db36c632d50f8235824afc87bdb03196fdca3b03f1d25a799";

async function collectMuseSession(subagentIds: readonly string[]) {
    const storeRoot = await sessionStoreRootDirectory();
    const artifactDirectory = await sessionStoreRootDirectory();
    await writeMuseSession(storeRoot, DAY, "wanted-session", subagentIds);
    const transcript = await collectSessionTranscript({
        artifactDirectory,
        sessionId: "wanted-session",
        store: museSessionStore({ XDG_DATA_HOME: storeRoot })
    });
    return { artifactDirectory, transcript };
}

/** Where the copy of a Muse session lands: under the day the CLI filed it, as the CLI had it. */
function museSessionCopy(artifactDirectory: string): string {
    return join(
        artifactDirectory,
        SESSION_TRANSCRIPT_DIRECTORY,
        "sessions",
        ...DAY,
        "wanted-session"
    );
}

describe("session transcript collection", () => {
    it("copies every subagent transcript the stream never carried", async () => {
        const { artifactDirectory, transcript } = await collectMuseSession(["sub-a", "sub-b"]);
        const session = join(museSessionCopy(artifactDirectory), "subagent");

        expect(transcript.gap).toBeUndefined();
        await expect(readFile(join(session, "sub-a", "session.jsonl"), "utf8")).resolves.toBe(
            '{"subagent":"sub-a"}\n'
        );
        await expect(readFile(join(session, "sub-b", "session.jsonl"), "utf8")).resolves.toBe(
            '{"subagent":"sub-b"}\n'
        );
    });

    it("hashes each copied file and lists them in a fixed order", async () => {
        const { transcript } = await collectMuseSession(["sub-b", "sub-a"]);

        expect(transcript.files.map((file) => file.path)).toEqual(
            [...transcript.files.map((file) => file.path)].sort()
        );
        expect(transcript.files).toHaveLength(3);
        expect(transcript.files.find((file) => file.path.includes("sub-b"))).toMatchObject({
            bytes: 21,
            sha256: SUB_B_SHA256
        });
    });

    /**
     * The Claude CLI files a session under the directory it was run from, so a session resumed
     * elsewhere is written under two projects under the one id. Both are the run's record and both
     * are kept: taken by name alone the second would land on the first, and the manifest would list
     * one transcript with nothing to say it had ever held two.
     */
    it("keeps both transcripts when two projects hold the session under one id", async () => {
        const storeRoot = await sessionStoreRootDirectory();
        const artifactDirectory = await sessionStoreRootDirectory();
        await writeClaudeSession(storeRoot, "-Users-crew-lab", "wanted-session");
        await writeClaudeSession(storeRoot, "-Users-crew-notes", "wanted-session");

        const transcript = await collectSessionTranscript({
            artifactDirectory,
            sessionId: "wanted-session",
            store: claudeSessionStore({ CLAUDE_CONFIG_DIR: storeRoot })
        });

        const kept = join(artifactDirectory, SESSION_TRANSCRIPT_DIRECTORY, "projects");
        await expect(
            readFile(join(kept, "-Users-crew-lab", "wanted-session.jsonl"), "utf8")
        ).resolves.toBe('{"type":"assistant"}\n');
        await expect(
            readFile(join(kept, "-Users-crew-notes", "wanted-session.jsonl"), "utf8")
        ).resolves.toBe('{"type":"assistant"}\n');
        expect(transcript.files).toHaveLength(6);
    });

    it("keeps a copied transcript as unreadable to others as the lab's own artifacts", async () => {
        const { artifactDirectory } = await collectMuseSession(["sub-a"]);
        const copied = join(museSessionCopy(artifactDirectory), "session.jsonl");

        const mode = (await stat(copied)).mode & 0o777;
        expect(mode).toBe(HARNESS_ARTIFACT_FILE_MODE);
    });

    it("records a run that never learned its session id rather than reporting an empty store", async () => {
        const storeRoot = await sessionStoreRootDirectory();

        await expect(
            collectSessionTranscript({
                artifactDirectory: await sessionStoreRootDirectory(),
                sessionId: null,
                store: museSessionStore({ XDG_DATA_HOME: storeRoot })
            })
        ).resolves.toMatchObject({ gap: SessionTranscriptGaps.NO_SESSION, files: [] });
    });

    it("tells a store that is not there from one holding nothing for this session", async () => {
        const storeRoot = await sessionStoreRootDirectory();
        const request = {
            artifactDirectory: await sessionStoreRootDirectory(),
            sessionId: "wanted-session"
        };

        const absent = await collectSessionTranscript({
            ...request,
            store: museSessionStore({ XDG_DATA_HOME: storeRoot })
        });
        await writeMuseSession(storeRoot, DAY, "another-session", []);
        const present = await collectSessionTranscript({
            ...request,
            store: museSessionStore({ XDG_DATA_HOME: storeRoot })
        });

        expect(absent.gap).toBe(SessionTranscriptGaps.NO_STORE);
        expect(present.gap).toBe(SessionTranscriptGaps.NOT_FOUND);
    });

    /**
     * A run that produced an answer produced it whether or not its CLI's account of it could be read
     * afterwards, so a store that cannot be copied is written down and the run keeps its result.
     */
    it("records why a copy failed instead of raising through the run", async () => {
        const store: SessionStore = {
            root: "/store/that/answers",
            locate: () => Promise.resolve(["/does/not/exist/session"])
        };

        const transcript = await collectSessionTranscript({
            artifactDirectory: await sessionStoreRootDirectory(),
            sessionId: "wanted-session",
            store
        });

        expect(transcript.gap).toBe(SessionTranscriptGaps.FAILED);
        expect(transcript.detail).toContain("/does/not/exist/session");
        expect(transcript.source).toBe("/store/that/answers");
    });
});
