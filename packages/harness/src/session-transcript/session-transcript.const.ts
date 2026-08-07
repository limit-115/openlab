/** Where a run keeps the copy of its CLI's own session, beside the artifacts the lab wrote itself. */
export const SESSION_TRANSCRIPT_DIRECTORY = "session";

/**
 * Why a run holds no copy of its CLI's own session. Absence is recorded as one of these rather than
 * as an empty list, because a CLI that kept nothing and a lab that failed to read what it kept are
 * different facts, and only one of them is a defect the operator can act on.
 */
export const SessionTranscriptGaps = {
    /** The run never reached the point of being told which session it was. */
    NO_SESSION: "no_session",
    /** The CLI keeps no store at the path it resolves, so there was never anything to copy. */
    NO_STORE: "no_store",
    /** The store is there and holds nothing under this session's name. */
    NOT_FOUND: "not_found",
    /** Reading or copying raised. The detail carries what. */
    FAILED: "failed"
} as const;

export type SessionTranscriptGap =
    (typeof SessionTranscriptGaps)[keyof typeof SessionTranscriptGaps];

/** Codex and Muse both file a session under the day it started. Their stores are walked no deeper. */
export const DAY_PARTITION_DEPTH = 3;
