import { describe, expect, it } from "vitest";
import { EventType } from "#src/investigation-events/event-type.const";
import { NotificationChannelKind } from "#src/operator-notifications/notification-channel.const";
import {
    withKeptChannelSecrets,
    withoutChannelSecrets
} from "#src/operator-notifications/notification-channel-secrets";
import {
    NotificationSettingsSchema,
    NotificationSettingsUpdateSchema
} from "#src/operator-notifications/notification-settings.schema";

const STORED = NotificationSettingsSchema.parse({
    channels: [
        {
            kind: NotificationChannelKind.TELEGRAM,
            enabled: true,
            bot_token: "1234:secret",
            chat_id: "-1001"
        }
    ]
});

describe("withoutChannelSecrets", () => {
    it("serves the chat and the moments, and never the token the bot authenticates with", () => {
        const [served] = withoutChannelSecrets(STORED).channels;

        expect(served).toEqual({
            kind: NotificationChannelKind.TELEGRAM,
            enabled: true,
            events: STORED.channels[0]?.events,
            language: STORED.channels[0]?.language,
            chat_id: "-1001",
            bot_token_set: true
        });
        expect(JSON.stringify(served)).not.toContain("1234:secret");
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

        expect(withKeptChannelSecrets(update, { channels: [] }).channels).toEqual([]);
    });

    it("forgets a channel the operator removed, token and all", () => {
        const update = NotificationSettingsUpdateSchema.parse({ channels: [] });

        expect(withKeptChannelSecrets(update, STORED).channels).toEqual([]);
    });
});
