import { NotificationChannelKind } from "@nightlab/protocol/operator-notifications/notification-channel.const";
import type { NotificationChannel } from "#src/notification-channel/notification-channel.types";
import { NotificationDeliveryError } from "#src/notification-channel/notification-delivery-error";
import { NotificationDeliveryFailure } from "#src/notification-channel/notification-delivery-error.const";
import type {
    DeliveredNotification,
    NotificationMessage
} from "#src/notification-channel/notification-message.types";
import {
    TELEGRAM_API_ORIGIN,
    TELEGRAM_PARSE_MODE,
    TELEGRAM_REQUEST_TIMEOUT_MS,
    TelegramMethod
} from "#src/telegram-bot/telegram-bot-channel.const";
import type {
    TelegramApiResponse,
    TelegramBotChannelOptions,
    TelegramSentMessage
} from "#src/telegram-bot/telegram-bot-channel.types";
import { telegramMessageMarkup } from "#src/telegram-bot/telegram-message-markup";

/**
 * One bot writing to one chat. The bot is a Telegram account of its own, so a chat only receives
 * anything after somebody has started it or added the bot to it; a channel the operator has just
 * configured therefore fails with Telegram's own words, which name which of the two is missing.
 *
 * Nothing built here is derived from the request address: the token sits in the path, and this
 * error is shown on a settings page and written to the daemon log.
 */
export class TelegramBotChannel implements NotificationChannel {
    readonly kind = NotificationChannelKind.TELEGRAM;
    readonly #endpoint: string;
    readonly #chatId: string;
    readonly #answersBack: boolean;
    readonly #request: typeof fetch;
    readonly #timeoutMs: number;

    constructor(options: TelegramBotChannelOptions) {
        this.#endpoint = `${TELEGRAM_API_ORIGIN}/bot${options.botToken}/${TelegramMethod.SEND_MESSAGE}`;
        this.#chatId = options.chatId;
        this.#answersBack = options.answersBack ?? false;
        this.#request = options.request ?? fetch;
        this.#timeoutMs = options.timeoutMs ?? TELEGRAM_REQUEST_TIMEOUT_MS;
    }

    async deliver(
        message: NotificationMessage,
        signal?: AbortSignal
    ): Promise<DeliveredNotification> {
        const answer = await this.#send(message, signal);
        const body = await this.#read(answer);
        if (body.ok !== true) {
            throw new NotificationDeliveryError(
                this.kind,
                NotificationDeliveryFailure.REFUSED,
                body.description ?? `Telegram answered ${answer.status}`
            );
        }
        const sent = body.result?.message_id;
        return sent === undefined ? {} : { reference: String(sent) };
    }

    async #send(message: NotificationMessage, signal?: AbortSignal): Promise<Response> {
        try {
            return await this.#request(this.#endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: this.#chatId,
                    text: telegramMessageMarkup(message),
                    parse_mode: TELEGRAM_PARSE_MODE,
                    link_preview_options: { is_disabled: true },
                    /**
                     * Telegram opens the reply box on the operator's own screen, which is the whole
                     * of the affordance: they answer where they read it rather than going to find
                     * the lab. It is offered only where the lab is actually listening.
                     */
                    ...(message.awaitsAnswer === true && this.#answersBack
                        ? { reply_markup: { force_reply: true } }
                        : {})
                }),
                signal: signal ?? AbortSignal.timeout(this.#timeoutMs)
            });
        } catch (error) {
            throw new NotificationDeliveryError(
                this.kind,
                NotificationDeliveryFailure.UNREACHABLE,
                error instanceof Error ? error.message : String(error),
                { cause: error }
            );
        }
    }

    /**
     * Telegram reports a refusal in the body as readily as in the status, so the body is what is
     * read. A gateway between the lab and Telegram answers with something else entirely, and that
     * is a third thing again: the operator has not misconfigured anything and there is nothing in
     * the answer worth quoting to them.
     */
    async #read(answer: Response): Promise<TelegramApiResponse<TelegramSentMessage>> {
        try {
            return (await answer.json()) as TelegramApiResponse<TelegramSentMessage>;
        } catch (error) {
            throw new NotificationDeliveryError(
                this.kind,
                NotificationDeliveryFailure.UNREADABLE,
                `Telegram answered ${answer.status} with something other than its own response`,
                { cause: error }
            );
        }
    }
}
