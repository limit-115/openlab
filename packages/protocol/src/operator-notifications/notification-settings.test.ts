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
        const [channel] = NotificationSettingsSchema.parse({ channels: [TELEGRAM] }).channels;

        expect(channel?.events).toEqual(DEFAULT_NOTIFIED_EVENTS);
        expect(channel?.language).toBe(DEFAULT_NOTIFICATION_LANGUAGE);
    });

    it("holds a configured channel silent until it is switched on", () => {
        const [channel] = NotificationSettingsSchema.parse({ channels: [TELEGRAM] }).channels;

        expect(channel?.enabled).toBe(false);
    });

    it("keeps the moments and the language the operator chose for a channel", () => {
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
