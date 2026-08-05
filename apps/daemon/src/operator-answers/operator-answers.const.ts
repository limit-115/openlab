/** What the lab made of something the operator said in the chat. */
export const ReplyResolution = {
    ANSWERED: "answered",
    NOTHING_ASKED: "nothing_asked",
    SEVERAL_ASKED: "several_asked"
} as const;
export type ReplyResolution = (typeof ReplyResolution)[keyof typeof ReplyResolution];

/**
 * How long to wait before reading the chat again after it could not be read, or while no channel is
 * open to answering. Telegram already holds a read open for its own wait, so this is the pause
 * between attempts rather than the rate the lab listens at.
 */
export const REPLY_RETRY_MS = 30_000;

/**
 * How many questions the lab remembers having asked. A question is remembered only so a reply can
 * be tied back to it, and a chat nobody has answered in for that many questions has moved on.
 */
export const REMEMBERED_QUESTIONS = 100;
