/**
 * The one host a bot token is valid at. It is pinned for the same reason a model endpoint is: a
 * configurable origin is a credential quietly handed to whoever set the configuration.
 */
export const TELEGRAM_API_ORIGIN = "https://api.telegram.org" as const;

export const TelegramMethod = {
    SEND_MESSAGE: "sendMessage",
    GET_UPDATES: "getUpdates"
} as const;

/**
 * Telegram holds a read open until something is said or the wait runs out, so the lab asks once and
 * waits rather than asking over and over. The request has to outlast the wait it asked Telegram for,
 * or the lab hangs up on its own question every time nobody says anything.
 */
export const TELEGRAM_POLL_SECONDS = 25;
export const TELEGRAM_POLL_TIMEOUT_MS = 30_000;

/** Only what somebody wrote. The lab has no use for edits, reactions, or who joined the chat. */
export const TELEGRAM_LISTENED_UPDATES = ["message"] as const;

/**
 * HTML rather than MarkdownV2. Both mark up the same few things, but MarkdownV2 makes eighteen
 * ordinary punctuation marks fatal in running text, and the text here is written by agents.
 */
export const TELEGRAM_PARSE_MODE = "HTML" as const;

/** A notification is worth a short wait and nothing more: the lab has research to get back to. */
export const TELEGRAM_REQUEST_TIMEOUT_MS = 15_000;

/** What Telegram accepts in one message. Anything longer is refused outright rather than cut. */
export const TELEGRAM_TEXT_LIMIT = 4096;

/**
 * How much of one written value a message carries. Agents write claims by the paragraph, and a
 * message is a reason to open the lab rather than the lab itself, so a long value is clipped and
 * the link under it leads to the whole of it.
 */
export const TELEGRAM_VALUE_LIMIT = 400;

export const CLIPPED_MARK = "…" as const;
