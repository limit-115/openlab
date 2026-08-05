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
    changeDefaults,
    changeTelegram,
    channelReport,
    chooseChannelMoment,
    chooseLabMoment,
    draftFromSettings,
    followLabLanguage,
    followLabMoments,
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
        const draft = draftFromSettings(UNCONFIGURED);

        expect(draft.telegram.chatId).toBe("");
        expect(draft.telegram.enabled).toBe(false);
        expect(draft.defaults.events).toEqual(DEFAULT_NOTIFIED_EVENTS);
    });

    /** Filling these in would freeze the channel on today's answer the moment anything was saved. */
    it("leaves a channel that answered neither question following the lab", () => {
        const draft = draftFromSettings(CONFIGURED);

        expect(draft.telegram.events).toBeUndefined();
        expect(draft.telegram.language).toBeUndefined();
        expect(channelReport(draft).events).toEqual(draft.defaults.events);
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

    /** Naming them would store today's answer, and the channel would stop following the lab. */
    it("names neither the moments nor the language of a channel that follows the lab", () => {
        const [channel] = settingsSubmission(draftFromSettings(CONFIGURED)).channels;

        expect(channel).not.toHaveProperty("events");
        expect(channel).not.toHaveProperty("language");
    });

    it("names only the question the channel took over, and leaves the other to the lab", () => {
        const draft = followLabLanguage(draftFromSettings(CONFIGURED), false);

        const [channel] = settingsSubmission(
            changeTelegram(draft, { language: NotificationLanguage.RU })
        ).channels;

        expect(channel).toMatchObject({ language: NotificationLanguage.RU });
        expect(channel).not.toHaveProperty("events");
    });

    it("sends what the operator narrowed the lab itself to", () => {
        const draft = chooseLabMoment(
            draftFromSettings(CONFIGURED),
            EventType.INVESTIGATION_HIBERNATED,
            false
        );

        expect(settingsSubmission(draft).defaults.events).not.toContain(
            EventType.INVESTIGATION_HIBERNATED
        );
        expect(settingsSubmission(draft).defaults.events).toContain(
            EventType.BREAKTHROUGH_RECORDED
        );
    });

    /** Leaving the channel out is what makes the lab forget the credential it was holding. */
    it("leaves a channel with nowhere to write out of the document entirely", () => {
        const draft = changeTelegram(draftFromSettings(CONFIGURED), { chatId: "  " });

        expect(settingsSubmission(draft).channels).toEqual([]);
    });
});

describe("followLabMoments", () => {
    /** The list on screen as the switch is reached for is the one the operator means to depart from. */
    it("starts a channel taking over on what it is reporting right now", () => {
        const narrowed = chooseLabMoment(
            draftFromSettings(CONFIGURED),
            EventType.INVESTIGATION_HIBERNATED,
            false
        );

        const own = followLabMoments(narrowed, false);

        expect(own.telegram.events).toEqual(narrowed.defaults.events);
        expect(own.telegram.events).not.toContain(EventType.INVESTIGATION_HIBERNATED);
    });

    it("hands the question back to the lab, so a later change to it reaches the channel again", () => {
        const own = chooseChannelMoment(
            followLabMoments(draftFromSettings(CONFIGURED), false),
            EventType.BREAKTHROUGH_RECORDED,
            false
        );

        const following = followLabMoments(own, true);

        expect(following.telegram.events).toBeUndefined();
        expect(channelReport(following).events).toContain(EventType.BREAKTHROUGH_RECORDED);
    });
});

describe("isSubmittable", () => {
    it("offers to save a lab that reports to nobody, which is a real answer", () => {
        expect(isSubmittable(draftFromSettings(UNCONFIGURED))).toBe(true);
    });

    it("refuses a chat the lab has no bot to write to it as", () => {
        const draft = changeTelegram(draftFromSettings(UNCONFIGURED), { chatId: "-1001" });

        expect(isSendable(draft)).toBe(false);
        expect(isSubmittable(draft)).toBe(false);
    });

    it("refuses a channel told to report nothing, which is a switch dressed as a subscription", () => {
        const emptied = DEFAULT_NOTIFIED_EVENTS.reduce(
            (draft, moment) => chooseChannelMoment(draft, moment, false),
            followLabMoments(draftFromSettings(CONFIGURED), false)
        );

        expect(emptied.telegram.events).toEqual([]);
        expect(isSubmittable(emptied)).toBe(false);
    });

    /** Every channel following the lab would go silent, and none of them would say why. */
    it("refuses a lab told to report nothing, though no channel disagreed", () => {
        const emptied = DEFAULT_NOTIFIED_EVENTS.reduce(
            (draft, moment) => chooseLabMoment(draft, moment, false),
            draftFromSettings(UNCONFIGURED)
        );

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
        const withoutBreakthrough = chooseLabMoment(
            draftFromSettings(CONFIGURED),
            EventType.BREAKTHROUGH_RECORDED,
            false
        );

        expect(hasUnsavedEdits(withoutBreakthrough, CONFIGURED)).toBe(true);
        expect(
            hasUnsavedEdits(
                changeDefaults(draftFromSettings(CONFIGURED), {
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

    /**
     * Taking the question over changes nothing about what is delivered today, and everything about
     * what happens to the channel the next time the lab's own answer moves.
     */
    it("counts a channel taking a question over though it reports exactly the same today", () => {
        const own = followLabMoments(draftFromSettings(CONFIGURED), false);

        expect(channelReport(own).events).toEqual(draftFromSettings(CONFIGURED).defaults.events);
        expect(hasUnsavedEdits(own, CONFIGURED)).toBe(true);
    });
});
