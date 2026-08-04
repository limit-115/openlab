import type { NotificationMessage } from "#src/notification-channel/notification-message.types";
import {
    CLIPPED_MARK,
    TELEGRAM_TEXT_LIMIT,
    TELEGRAM_VALUE_LIMIT
} from "#src/telegram-bot/telegram-bot-channel.const";

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
};

/**
 * Telegram parses the message as HTML, so every character the lab did not mean as markup has to
 * stop being one. Agents write angle brackets and ampersands constantly, and an unescaped one does
 * not render oddly: Telegram refuses the whole message.
 */
export function escapeTelegramHtml(value: string): string {
    return value.replace(/[&<>"]/g, (character) => HTML_ESCAPES[character] ?? character);
}

/** Cut on a whole character rather than a code unit, so an emoji never ends up half sent. */
export function clip(value: string, limit: number): string {
    const characters = [...value];
    return characters.length <= limit
        ? value
        : `${characters.slice(0, limit).join("").trimEnd()}${CLIPPED_MARK}`;
}

/**
 * The message as Telegram will draw it: the title alone on the first line, then what happened, then
 * the readings under it, then the way back into the lab.
 *
 * Escaping is the last step and it can grow the text fivefold, so a message whose values were each
 * short enough can still overrun what Telegram accepts. One that does is sent as its headline and
 * its link rather than clipped, because clipping finished markup cuts through a tag and Telegram
 * answers a malformed message by dropping all of it.
 */
export function telegramMessageMarkup(message: NotificationMessage): string {
    const headline = markupHeadline(message);
    const written = [
        headline,
        escapeTelegramHtml(clip(message.body, TELEGRAM_VALUE_LIMIT)),
        message.facts
            .map(
                (fact) =>
                    `${escapeTelegramHtml(fact.label)}: ${escapeTelegramHtml(
                        clip(fact.value, TELEGRAM_VALUE_LIMIT)
                    )}`
            )
            .join("\n"),
        markupLink(message)
    ];

    const whole = joinBlocks(written);
    return whole.length <= TELEGRAM_TEXT_LIMIT
        ? whole
        : joinBlocks([headline, markupLink(message)]);
}

function markupHeadline(message: NotificationMessage): string {
    return `<b>${escapeTelegramHtml(clip(message.title, TELEGRAM_VALUE_LIMIT))}</b>`;
}

/**
 * The link preview is off because the target is a dashboard the recipient has to be on the lab's
 * network to load, and an unfurl of it is a grey box pushing the message it belongs to off screen.
 */
function markupLink(message: NotificationMessage): string {
    if (message.link === undefined) {
        return "";
    }
    const label = escapeTelegramHtml(clip(message.link.label, TELEGRAM_VALUE_LIMIT));
    return `<a href="${escapeTelegramHtml(message.link.url)}">${label}</a>`;
}

function joinBlocks(blocks: readonly string[]): string {
    return blocks.filter((block) => block.length > 0).join("\n\n");
}
