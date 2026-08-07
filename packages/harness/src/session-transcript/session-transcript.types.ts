import type { HarnessArtifact } from "#src/agent-harness/agent-harness.types";
import type { SessionTranscriptGap } from "#src/session-transcript/session-transcript.const";

/**
 * The CLI's own record of a session, which is not the same thing as the stream the lab captured. A
 * CLI that delegates to subagents writes their transcripts here and only here: what the lab reads on
 * stdout is the parent thread, and everything a delegated agent read, ran and concluded is a file the
 * CLI wrote beside it.
 */
export interface SessionStore {
    /** The directory the CLI resolves for itself, so a manifest can name where a copy came from. */
    readonly root: string;
    /** Every path the CLI wrote for one session. Empty when it wrote none, rather than throwing. */
    locate(sessionId: string): Promise<readonly string[]>;
}

/**
 * What the lab holds of a CLI's own session. `files` is the copy, hashed; `gap` says why there is no
 * copy when there is none. One of the two is always populated, so a reader is never left to guess
 * whether a run had no subagents or the lab lost them.
 */
export interface SessionTranscript {
    readonly source: string;
    readonly files: readonly HarnessArtifact[];
    readonly gap?: SessionTranscriptGap;
    readonly detail?: string;
}

export interface SessionTranscriptRequest {
    readonly artifactDirectory: string;
    readonly sessionId: string | null;
    readonly store: SessionStore;
}
