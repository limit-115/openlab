import { describe, expect, it } from "vitest";
import type { NotificationMessage } from "#src/notification-channel/notification-message.types";
import {
    CLIPPED_MARK,
    TELEGRAM_TEXT_LIMIT,
    TELEGRAM_VALUE_LIMIT
} from "#src/telegram-bot/telegram-bot-channel.const";
import { telegramMessageMarkup } from "#src/telegram-bot/telegram-message-markup";

const MESSAGE: NotificationMessage = {
    title: "Breakthrough",
    body: "A finding survived independent verification.",
    facts: [{ label: "Investigation", value: "Find a conservation bug" }],
    link: { label: "Open the investigation", url: "http://127.0.0.1:4318/investigations/one" }
};

describe("telegramMessageMarkup", () => {
    it("marks up the title and the link, and leaves the words themselves alone", () => {
        const markup = telegramMessageMarkup(MESSAGE);

        expect(markup).toContain("<b>Breakthrough</b>");
        expect(markup).toContain(
            '<a href="http://127.0.0.1:4318/investigations/one">Open the investigation</a>'
        );
        expect(markup).toContain("Investigation: Find a conservation bug");
    });

    it("stops an agent's angle brackets from being read as markup Telegram would refuse", () => {
        const markup = telegramMessageMarkup({
            ...MESSAGE,
            body: 'The check <b>fails</b> when a & b are "equal"'
        });

        expect(markup).toContain("The check &lt;b&gt;fails&lt;/b&gt; when a &amp; b are &quot;");
        expect(markup).not.toContain("<b>fails</b>");
    });

    it("clips a value an agent wrote by the paragraph and says that it did", () => {
        const markup = telegramMessageMarkup({ ...MESSAGE, body: "x".repeat(2000) });

        expect(markup).toContain(CLIPPED_MARK);
        expect(markup).not.toContain("x".repeat(TELEGRAM_VALUE_LIMIT + 1));
    });

    it("omits the link block for a message that is the whole story", () => {
        const { link, ...standalone } = MESSAGE;

        expect(telegramMessageMarkup(standalone)).not.toContain("<a href=");
    });

    /**
     * Escaping grows the text, so values that each fit can still overrun together. Cutting the
     * assembled markup would cut through a tag and Telegram drops a malformed message whole.
     */
    it("falls back to the headline and the link when escaping overruns what Telegram takes", () => {
        const markup = telegramMessageMarkup({
            ...MESSAGE,
            facts: Array.from({ length: 40 }, (_entry, index) => ({
                label: `Reading ${index}`,
                value: "&".repeat(TELEGRAM_VALUE_LIMIT)
            }))
        });

        expect(markup.length).toBeLessThanOrEqual(TELEGRAM_TEXT_LIMIT);
        expect(markup).toContain("<b>Breakthrough</b>");
        expect(markup).toContain("<a href=");
        expect(markup).not.toContain("Reading 0");
    });
});
