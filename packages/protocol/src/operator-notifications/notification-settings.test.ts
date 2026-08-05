import { describe, expect, it } from "vitest";
import { EventType } from "#src/investigation-events/event-type.const";
import {
    NotificationChannelKind,
    NotificationLanguage
} from "#src/operator-notifications/notification-channel.const";
import {
    DEFAULT_NOTIFICATION_LANGUAGE,
    DEFAULT_NOTIFIED_EVENTS
} from "#src/operator-notifications/notification-settings.const";
import { NotificationSettingsSchema } from "#src/operator-notifications/notification-settings.schema";

const TELEGRAM = {
    kind: NotificationChannelKind.TELEGRAM,
    bot_token: "1234:secret",
    chat_id: "-1001"
};

describe("NotificationSettingsSchema", () => {
    it("reads a lab nobody configured as one that tells nobody anything", () => {
        expect(NotificationSettingsSchema.parse({}).channels).toEqual([]);
    });

    it("reports every notifiable moment, in the lab's own language, until narrowed", () => {
        const { defaults } = NotificationSettingsSchema.parse({});

        expect(defaults.events).toEqual(DEFAULT_NOTIFIED_EVENTS);
        expect(defaults.language).toBe(DEFAULT_NOTIFICATION_LANGUAGE);
    });

    /**
     * A channel that answered neither question has to stay unanswered rather than be filled in with
     * today's defaults, or narrowing what the lab reports would never reach a channel again.
     */
    it("leaves a channel that answered neither question following the lab", () => {
        const [channel] = NotificationSettingsSchema.parse({ channels: [TELEGRAM] }).channels;

        expect(channel?.events).toBeUndefined();
        expect(channel?.language).toBeUndefined();
    });

    it("keeps the moments and the language the operator narrowed the lab itself to", () => {
        const { defaults } = NotificationSettingsSchema.parse({
            defaults: {
                events: [EventType.BREAKTHROUGH_RECORDED],
                language: NotificationLanguage.RU
            }
        });

        expect(defaults.events).toEqual([EventType.BREAKTHROUGH_RECORDED]);
        expect(defaults.language).toBe(NotificationLanguage.RU);
    });

    it("refuses a lab told to report nothing at all, which is a switch dressed as a subscription", () => {
        expect(() => NotificationSettingsSchema.parse({ defaults: { events: [] } })).toThrow();
    });

    it("holds a configured channel silent until it is switched on", () => {
        const [channel] = NotificationSettingsSchema.parse({ channels: [TELEGRAM] }).channels;

        expect(channel?.enabled).toBe(false);
    });

    /**
     * Whoever can write in the chat answers for the operator, and what they write is carried to an
     * agent verbatim. A lab configured before the lab could listen must not start listening because
     * it was upgraded, so the settings it already had have to read as a chat that may not answer.
     */
    it("takes no answer from a chat until the operator opens it to one", () => {
        const [channel] = NotificationSettingsSchema.parse({ channels: [TELEGRAM] }).channels;

        expect(channel).toMatchObject({ answers_back: false });
    });

    it("keeps the moments and the language the operator chose for one channel", () => {
        const [channel] = NotificationSettingsSchema.parse({
            channels: [
                {
                    ...TELEGRAM,
                    enabled: true,
                    events: [EventType.BREAKTHROUGH_RECORDED],
                    language: NotificationLanguage.RU
                }
            ]
        }).channels;

        expect(channel?.events).toEqual([EventType.BREAKTHROUGH_RECORDED]);
        expect(channel?.language).toBe(NotificationLanguage.RU);
    });

    it("refuses a channel reporting nothing, which is a switch dressed as a subscription", () => {
        expect(() =>
            NotificationSettingsSchema.parse({ channels: [{ ...TELEGRAM, events: [] }] })
        ).toThrow();
    });

    it("refuses a moment listed twice, which would send the same message twice", () => {
        expect(() =>
            NotificationSettingsSchema.parse({
                channels: [
                    {
                        ...TELEGRAM,
                        events: [EventType.BREAKTHROUGH_RECORDED, EventType.BREAKTHROUGH_RECORDED]
                    }
                ]
            })
        ).toThrow();
    });

    it("refuses a moment the lab never offers to report", () => {
        expect(() =>
            NotificationSettingsSchema.parse({
                channels: [{ ...TELEGRAM, events: [EventType.RUN_STARTED] }]
            })
        ).toThrow();
    });

    it("refuses one channel configured twice, which names no winner", () => {
        expect(() =>
            NotificationSettingsSchema.parse({
                channels: [TELEGRAM, { ...TELEGRAM, chat_id: "-1002" }]
            })
        ).toThrow();
    });

    it("refuses a Telegram channel with no bot to send as and no chat to send to", () => {
        expect(() =>
            NotificationSettingsSchema.parse({ channels: [{ ...TELEGRAM, bot_token: "  " }] })
        ).toThrow();
        expect(() =>
            NotificationSettingsSchema.parse({ channels: [{ ...TELEGRAM, chat_id: "" }] })
        ).toThrow();
    });
});
