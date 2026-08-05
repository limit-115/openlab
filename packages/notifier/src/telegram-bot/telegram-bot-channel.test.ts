import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import { describe, expect, it, vi } from "vitest";
import { NotificationDeliveryError } from "#src/notification-channel/notification-delivery-error";
import { NotificationDeliveryFailure } from "#src/notification-channel/notification-delivery-error.const";
import type { NotificationMessage } from "#src/notification-channel/notification-message.types";
import { TelegramBotChannel } from "#src/telegram-bot/telegram-bot-channel";
import { TELEGRAM_API_ORIGIN, TelegramMethod } from "#src/telegram-bot/telegram-bot-channel.const";

const BOT_TOKEN = "1234567:AAHnotarealtoken";

const MESSAGE: NotificationMessage = {
    title: "Breakthrough",
    body: "A finding survived independent verification.",
    facts: [{ label: "Investigation", value: "Find a conservation bug" }],
    link: { label: "Open", url: "http://127.0.0.1:4318/investigations/one" }
};

function answering(body: unknown, status = 200) {
    return vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch &
        ReturnType<typeof vi.fn>;
}

function channel(request: ReturnType<typeof answering>, chatId = "-1001") {
    return new TelegramBotChannel({ botToken: BOT_TOKEN, chatId, request });
}

function sentTo(request: ReturnType<typeof answering>): { url: string; body: string } {
    const call = request.mock.calls[0];
    if (call === undefined) {
        throw new Error("The channel never reached Telegram");
    }
    return { url: String(call[0]), body: String(call[1]?.body) };
}

describe("TelegramBotChannel", () => {
    it("sends the drawn message to the named chat, at the one host the token is valid at", async () => {
        const request = answering({ ok: true, result: { message_id: 7 } });

        await channel(request).deliver(MESSAGE);

        const { url, body } = sentTo(request);
        expect(url).toBe(`${TELEGRAM_API_ORIGIN}/bot${BOT_TOKEN}/${TelegramMethod.SEND_MESSAGE}`);
        expect(JSON.parse(body)).toMatchObject({
            chat_id: "-1001",
            text: expect.stringContaining("<b>Breakthrough</b>"),
            parse_mode: "HTML"
        });
    });

    /** Without it there is nothing for a reply to be recognised as a reply to. */
    it("says what Telegram named the message, so an answer to it can be tied back", async () => {
        const request = answering({ ok: true, result: { message_id: 7 } });

        expect(await channel(request).deliver(MESSAGE)).toEqual({ reference: "7" });
    });

    it("opens the reply box on a question, so the operator answers where they read it", async () => {
        const request = answering({ ok: true, result: { message_id: 7 } });
        const listening = new TelegramBotChannel({
            botToken: BOT_TOKEN,
            chatId: "-1001",
            answersBack: true,
            request
        });

        await listening.deliver({ ...MESSAGE, awaitsAnswer: true });

        expect(JSON.parse(sentTo(request).body).reply_markup).toEqual({ force_reply: true });
    });

    /**
     * A reply box on a chat nobody is reading is worse than none: the operator answers, watches the
     * message send, and goes back to work believing the lab has been unblocked.
     */
    it("offers to take no answer through a chat the lab is not listening to", async () => {
        const request = answering({ ok: true, result: { message_id: 7 } });

        await channel(request).deliver({ ...MESSAGE, awaitsAnswer: true });

        expect(JSON.parse(sentTo(request).body)).not.toHaveProperty("reply_markup");
    });

    it("hands Telegram's own words back, which name the field the operator has to fix", async () => {
        const request = answering(
            { ok: false, error_code: 400, description: "Bad Request: chat not found" },
            400
        );

        await expect(channel(request).deliver(MESSAGE)).rejects.toMatchObject({
            channel: NotificationChannelKind.TELEGRAM,
            failure: NotificationDeliveryFailure.REFUSED,
            reason: "Bad Request: chat not found"
        });
    });

    /** The token sits in the request address, and this error is shown and logged. */
    it("keeps the bot token out of the failure it raises", async () => {
        const request = answering({ ok: false, description: "Unauthorized" }, 401);

        const failure = await channel(request)
            .deliver(MESSAGE)
            .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(NotificationDeliveryError);
        expect(JSON.stringify(failure)).not.toContain(BOT_TOKEN);
        expect(String((failure as Error).message)).not.toContain(BOT_TOKEN);
    });

    it("tells a service that never answered apart from one that said no", async () => {
        const request = vi.fn(async () => {
            throw new Error("getaddrinfo ENOTFOUND api.telegram.org");
        }) as unknown as ReturnType<typeof answering>;

        await expect(channel(request).deliver(MESSAGE)).rejects.toMatchObject({
            failure: NotificationDeliveryFailure.UNREACHABLE
        });
    });

    it("does not read a gateway's page as though Telegram had refused something", async () => {
        const request = vi.fn(
            async () => new Response("<html>502 Bad Gateway</html>", { status: 502 })
        ) as unknown as ReturnType<typeof answering>;

        await expect(channel(request).deliver(MESSAGE)).rejects.toMatchObject({
            failure: NotificationDeliveryFailure.UNREADABLE
        });
    });
});
