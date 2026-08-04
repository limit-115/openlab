/** What Telegram answers every method with. Errors carry the useful sentence in `description`. */
export interface TelegramApiResponse {
    readonly ok?: boolean;
    readonly description?: string;
    readonly error_code?: number;
}

export interface TelegramBotChannelOptions {
    /** Authenticates as the bot itself. Part of every request address, so it is never logged. */
    readonly botToken: string;
    readonly chatId: string;
    /** The transport, so a test can answer as Telegram without one of them being reached. */
    readonly request?: typeof fetch;
    readonly timeoutMs?: number;
}
