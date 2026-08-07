/**
 * The last answer the channel gave, and when it gave it.
 *
 * Remembering it is what keeps starting a lab from asking the channel every time. It is written
 * where an operator can read it and delete it, because a lab that seems to be wrong about what is
 * published should be answerable by looking at the one file that could be making it wrong.
 */
export interface UpdateCheck {
    readonly checked_at: string;
    readonly offered_version: string;
}

/** A release worth telling an operator about, and where they can read what is in it. */
export interface UpdateNotice {
    readonly offeredVersion: string;
    readonly notesUrl: string;
}
