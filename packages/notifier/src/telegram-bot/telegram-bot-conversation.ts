import type { OperatorReply } from "#src/notification-channel/notification-message.types";
import {
    TELEGRAM_API_ORIGIN,
    TELEGRAM_LISTENED_UPDATES,
    TELEGRAM_POLL_SECONDS,
    TELEGRAM_POLL_TIMEOUT_MS,
    TelegramMethod
} from "#src/telegram-bot/telegram-bot-channel.const";
import type {
    TelegramApiResponse,
    TelegramBotConversationOptions,
    TelegramUpdate
} from "#src/telegram-bot/telegram-bot-channel.types";

/**
 * The other half of one bot writing to one chat: what gets said back in it. Telegram holds the read
 * open until somebody writes, so this asks once and waits rather than asking over and over, and it
 * is the caller that decides how long to go on asking.
 *
 * Only the configured chat is heard. A bot is an account anybody who finds it can write to, and
 * what comes back here is carried to an agent as the operator's own words, so a message from
 * anywhere else is not a stranger's opinion to weigh — it is somebody else's hand on the lab.
 */
export class TelegramBotConversation {
    readonly #endpoint: string;
    readonly #chatId: string;
    readonly #listeningSince: number;
    readonly #request: typeof fetch;
    readonly #pollSeconds: number;
    readonly #timeoutMs: number;
    /** Telegram keeps handing back what it has not been told was read, so it is told. */
    #readThrough: number | undefined;

    constructor(options: TelegramBotConversationOptions) {
        this.#endpoint = `${TELEGRAM_API_ORIGIN}/bot${options.botToken}/${TelegramMethod.GET_UPDATES}`;
        this.#chatId = String(options.chatId);
        this.#listeningSince = Math.floor(options.listeningSince.getTime() / 1000);
        this.#request = options.request ?? fetch;
        this.#pollSeconds = options.pollSeconds ?? TELEGRAM_POLL_SECONDS;
        this.#timeoutMs = options.timeoutMs ?? TELEGRAM_POLL_TIMEOUT_MS;
    }

    /**
     * What has been said since the last read, waiting for it if nothing has. Nothing said is the
     * ordinary answer and yields an empty list rather than an error, and a read that fails throws
     * whatever went wrong: a chat the lab cannot reach is the caller's to report and back off from.
     */
    async read(signal?: AbortSignal): Promise<readonly OperatorReply[]> {
        const answer = await this.#request(this.#endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...(this.#readThrough === undefined ? {} : { offset: this.#readThrough }),
                timeout: this.#pollSeconds,
                allowed_updates: TELEGRAM_LISTENED_UPDATES
            }),
            signal: signal ?? AbortSignal.timeout(this.#timeoutMs)
        });
        const body = (await answer.json()) as TelegramApiResponse<TelegramUpdate[]>;
        if (body.ok !== true) {
            throw new Error(body.description ?? `Telegram answered ${answer.status}`);
        }
        const updates = body.result ?? [];
        this.#confirm(updates);
        return updates.flatMap((update) => this.#spoken(update));
    }

    /**
     * Reading is what acknowledges. Every update is confirmed, including the ones that yield
     * nothing, or one photo in the chat would be handed back for as long as the lab is up.
     */
    #confirm(updates: readonly TelegramUpdate[]): void {
        for (const { update_id } of updates) {
            if (update_id !== undefined) {
                this.#readThrough = Math.max(this.#readThrough ?? 0, update_id + 1);
            }
        }
    }

    #spoken(update: TelegramUpdate): readonly OperatorReply[] {
        const message = update.message;
        if (message?.text === undefined || message.date === undefined) {
            return [];
        }
        if (String(message.chat?.id ?? "") !== this.#chatId) {
            return [];
        }
        if (message.date < this.#listeningSince) {
            return [];
        }
        const answers = message.reply_to_message?.message_id;
        return [
            {
                text: message.text,
                sentAt: new Date(message.date * 1000),
                ...(answers === undefined ? {} : { answers: String(answers) })
            }
        ];
    }
}
