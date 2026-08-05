import { describe, expect, it } from "vitest";
import { EventType } from "#src/investigation-events/event-type.const";
import {
    NotificationChannelKind,
    NotificationLanguage
} from "#src/operator-notifications/notification-channel.const";
import {
    withKeptChannelSecrets,
    withoutChannelSecrets
} from "#src/operator-notifications/notification-channel-secrets";
import {
    NotificationSettingsSchema,
    NotificationSettingsUpdateSchema
} from "#src/operator-notifications/notification-settings.schema";

const NOTHING_STORED = NotificationSettingsSchema.parse({});

const STORED = NotificationSettingsSchema.parse({
    defaults: { language: NotificationLanguage.RU },
    channels: [
        {
            kind: NotificationChannelKind.TELEGRAM,
            enabled: true,
            bot_token: "1234:secret",
            chat_id: "-1001",
            language: NotificationLanguage.EN
        }
    ]
});

describe("withoutChannelSecrets", () => {
    it("serves the chat and the moments, and never the token the bot authenticates with", () => {
        const [served] = withoutChannelSecrets(STORED).channels;

        expect(served).toEqual({
            kind: NotificationChannelKind.TELEGRAM,
            enabled: true,
            language: NotificationLanguage.EN,
            chat_id: "-1001",
            answers_back: true,
            bot_token_set: true
        });
        expect(JSON.stringify(served)).not.toContain("1234:secret");
    });

    /** Without these the page could not say what a channel following the lab actually reports. */
    it("serves what the lab reports for the channels that answer no such question", () => {
        expect(withoutChannelSecrets(STORED).defaults).toEqual(STORED.defaults);
    });
});

describe("withKeptChannelSecrets", () => {
    it("keeps the stored token when the operator changes a channel without retyping it", () => {
        const update = NotificationSettingsUpdateSchema.parse({
            channels: [
                {
                    kind: NotificationChannelKind.TELEGRAM,
                    enabled: true,
                    chat_id: "-1002",
                    events: [EventType.BREAKTHROUGH_RECORDED]
                }
            ]
        });

        const kept = withKeptChannelSecrets(update, STORED);

        expect(kept.channels[0]).toMatchObject({
            bot_token: "1234:secret",
            chat_id: "-1002",
            events: [EventType.BREAKTHROUGH_RECORDED]
        });
    });

    it("takes the token the operator retyped over the one the lab was holding", () => {
        const update = NotificationSettingsUpdateSchema.parse({
            channels: [
                {
                    kind: NotificationChannelKind.TELEGRAM,
                    enabled: true,
                    chat_id: "-1001",
                    bot_token: "5678:rotated"
                }
            ]
        });

        expect(withKeptChannelSecrets(update, STORED).channels[0]).toMatchObject({
            bot_token: "5678:rotated"
        });
    });

    it("drops a channel the lab holds no token for, rather than storing one that cannot send", () => {
        const update = NotificationSettingsUpdateSchema.parse({
            channels: [{ kind: NotificationChannelKind.TELEGRAM, enabled: true, chat_id: "-1003" }]
        });

        expect(withKeptChannelSecrets(update, NOTHING_STORED).channels).toEqual([]);
    });

    it("forgets a channel the operator removed, token and all", () => {
        const update = NotificationSettingsUpdateSchema.parse({ channels: [] });

        expect(withKeptChannelSecrets(update, STORED).channels).toEqual([]);
    });

    /** The secrets are the only thing the page was not shown, so they are the only thing kept. */
    it("takes what the operator narrowed the lab itself to over what it was reporting", () => {
        const update = NotificationSettingsUpdateSchema.parse({
            defaults: {
                events: [EventType.BREAKTHROUGH_RECORDED],
                language: NotificationLanguage.EN
            },
            channels: []
        });

        expect(withKeptChannelSecrets(update, STORED).defaults).toEqual({
            events: [EventType.BREAKTHROUGH_RECORDED],
            language: NotificationLanguage.EN
        });
    });
});
