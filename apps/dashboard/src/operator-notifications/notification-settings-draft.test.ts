import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import {
    NotificationChannelKind,
    NotificationLanguage
} from "@lab/protocol/operator-notifications/notification-channel.const";
import { DEFAULT_NOTIFIED_EVENTS } from "@lab/protocol/operator-notifications/notification-settings.const";
import { NotificationSettingsViewSchema } from "@lab/protocol/operator-notifications/notification-settings.schema";
import type { NotificationSettingsView } from "@lab/protocol/operator-notifications/notification-settings.types";
import { describe, expect, it } from "vitest";
import {
    changeTelegram,
    chooseMoment,
    draftFromSettings,
    hasUnsavedEdits,
    isSendable,
    isSubmittable,
    settingsSubmission
} from "#src/operator-notifications/notification-settings-draft";

const CONFIGURED: NotificationSettingsView = NotificationSettingsViewSchema.parse({
    channels: [
        {
            kind: NotificationChannelKind.TELEGRAM,
            enabled: true,
            chat_id: "-1001",
            bot_token_set: true
        }
    ]
});

const UNCONFIGURED: NotificationSettingsView = NotificationSettingsViewSchema.parse({
    channels: []
});

describe("draftFromSettings", () => {
    it("offers a card for a channel the lab knows nothing about, on the shipped moments", () => {
        const { telegram } = draftFromSettings(UNCONFIGURED);

        expect(telegram.chatId).toBe("");
        expect(telegram.enabled).toBe(false);
        expect(telegram.events).toEqual(DEFAULT_NOTIFIED_EVENTS);
    });

    it("says a token is stored without pretending to know what it is", () => {
        const { telegram } = draftFromSettings(CONFIGURED);

        expect(telegram.botTokenStored).toBe(true);
        expect(telegram.botToken).toBe("");
    });
});

describe("settingsSubmission", () => {
    it("names no token when the operator retyped none, so the lab keeps the one it holds", () => {
        const submission = settingsSubmission(draftFromSettings(CONFIGURED));

        expect(submission.channels[0]).not.toHaveProperty("bot_token");
        expect(submission.channels[0]).toMatchObject({ chat_id: "-1001", enabled: true });
    });

    it("sends the token the operator typed", () => {
        const draft = changeTelegram(draftFromSettings(CONFIGURED), { botToken: " 5678:new " });

        expect(settingsSubmission(draft).channels[0]).toMatchObject({ bot_token: "5678:new" });
    });

    /** Leaving the channel out is what makes the lab forget the credential it was holding. */
    it("leaves a channel with nowhere to write out of the document entirely", () => {
        const draft = changeTelegram(draftFromSettings(CONFIGURED), { chatId: "  " });

        expect(settingsSubmission(draft).channels).toEqual([]);
    });
});

describe("isSubmittable", () => {
    it("offers to save a lab that reports to nobody, which is a real answer", () => {
        expect(isSubmittable(draftFromSettings(UNCONFIGURED))).toBe(true);
    });

    it("refuses a chat the lab has no bot to write to it as", () => {
        const draft = changeTelegram(draftFromSettings(UNCONFIGURED), { chatId: "-1001" });

        expect(isSendable(draft.telegram)).toBe(false);
        expect(isSubmittable(draft)).toBe(false);
    });

    it("refuses a channel told to report nothing, which is a switch dressed as a subscription", () => {
        const emptied = DEFAULT_NOTIFIED_EVENTS.reduce(
            (draft, moment) => chooseMoment(draft, moment, false),
            draftFromSettings(CONFIGURED)
        );

        expect(emptied.telegram.events).toEqual([]);
        expect(isSubmittable(emptied)).toBe(false);
    });
});

describe("hasUnsavedEdits", () => {
    it("holds nothing back when the page shows exactly what the lab is reporting by", () => {
        expect(hasUnsavedEdits(draftFromSettings(CONFIGURED), CONFIGURED)).toBe(false);
    });

    /** The page was never shown the stored token, so it cannot tell a retype from a rotation. */
    it("counts a retyped token as an edit even where it matches the stored one", () => {
        const draft = changeTelegram(draftFromSettings(CONFIGURED), { botToken: "1234:secret" });

        expect(hasUnsavedEdits(draft, CONFIGURED)).toBe(true);
    });

    it("counts a moment dropped, a language changed and a channel switched off", () => {
        const withoutBreakthrough = chooseMoment(
            draftFromSettings(CONFIGURED),
            EventType.BREAKTHROUGH_RECORDED,
            false
        );

        expect(hasUnsavedEdits(withoutBreakthrough, CONFIGURED)).toBe(true);
        expect(
            hasUnsavedEdits(
                changeTelegram(draftFromSettings(CONFIGURED), {
                    language: NotificationLanguage.RU
                }),
                CONFIGURED
            )
        ).toBe(true);
        expect(
            hasUnsavedEdits(
                changeTelegram(draftFromSettings(CONFIGURED), { enabled: false }),
                CONFIGURED
            )
        ).toBe(true);
    });
});
