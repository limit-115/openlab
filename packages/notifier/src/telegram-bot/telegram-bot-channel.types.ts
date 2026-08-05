/** What Telegram answers every method with. Errors carry the useful sentence in `description`. */
export interface TelegramApiResponse<Result = unknown> {
    readonly ok?: boolean;
    readonly result?: Result;
    readonly description?: string;
    readonly error_code?: number;
}

/** Telegram's own name for a message, which is what a reply to it quotes. */
export interface TelegramSentMessage {
    readonly message_id?: number;
}

/**
 * One thing said in a chat. Anything that is not somebody writing words — a photo, a sticker, a
 * notice that the chat's name changed — arrives with no text, and the lab has nothing to do with it.
 */
export interface TelegramIncomingMessage {
    readonly message_id?: number;
    readonly date?: number;
    readonly text?: string;
    readonly chat?: { readonly id?: number | string };
    readonly reply_to_message?: { readonly message_id?: number };
}

export interface TelegramUpdate {
    readonly update_id?: number;
    readonly message?: TelegramIncomingMessage;
}

export interface TelegramBotChannelOptions {
    /** Authenticates as the bot itself. Part of every request address, so it is never logged. */
    readonly botToken: string;
    readonly chatId: string;
    /**
     * Whether the lab is reading that chat. A message that awaits an answer opens the reply box
     * only where an answer would actually be read: offering to take one nobody will collect is
     * worse than saying nothing, because the operator believes they have answered.
     */
    readonly answersBack?: boolean;
    /** The transport, so a test can answer as Telegram without one of them being reached. */
    readonly request?: typeof fetch;
    readonly timeoutMs?: number;
}

export interface TelegramBotConversationOptions {
    readonly botToken: string;
    readonly chatId: string;
    /**
     * Anything said before this is a backlog rather than an answer. Telegram keeps what a bot has
     * not collected for about a day, so a lab coming back up would otherwise read a day-old message
     * as somebody answering the question it is holding now.
     */
    readonly listeningSince: Date;
    readonly request?: typeof fetch;
    readonly pollSeconds?: number;
    readonly timeoutMs?: number;
}
