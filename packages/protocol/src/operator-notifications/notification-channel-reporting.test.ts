import { describe, expect, it } from "vitest";
import { EventType } from "#src/investigation-events/event-type.const";
import { NotificationLanguage } from "#src/operator-notifications/notification-channel.const";
import { channelReporting } from "#src/operator-notifications/notification-channel-reporting";
import { NotificationSettingsSchema } from "#src/operator-notifications/notification-settings.schema";

const { defaults } = NotificationSettingsSchema.parse({
    defaults: {
        events: [EventType.BREAKTHROUGH_RECORDED, EventType.INVESTIGATION_FAILED],
        language: NotificationLanguage.EN
    }
});

describe("channelReporting", () => {
    it("gives a channel that answered nothing whatever the lab currently reports", () => {
        expect(channelReporting({}, defaults)).toEqual({
            events: [EventType.BREAKTHROUGH_RECORDED, EventType.INVESTIGATION_FAILED],
            language: NotificationLanguage.EN
        });
    });

    /** The pair is resolved one question at a time, or a second recipient could not just be Russian. */
    it("lets a channel take the lab's moments and still write in its own language", () => {
        const reporting = channelReporting({ language: NotificationLanguage.RU }, defaults);

        expect(reporting.language).toBe(NotificationLanguage.RU);
        expect(reporting.events).toEqual(defaults.events);
    });

    it("lets a channel narrow the moments and still write in the lab's own language", () => {
        const reporting = channelReporting({ events: [EventType.CAPABILITY_REQUESTED] }, defaults);

        expect(reporting.events).toEqual([EventType.CAPABILITY_REQUESTED]);
        expect(reporting.language).toBe(NotificationLanguage.EN);
    });

    /** A channel may want more than the lab reports by default, not only less. */
    it("lets a channel ask for a moment the lab left out of its own answer", () => {
        const reporting = channelReporting(
            { events: [EventType.HARNESS_PREFLIGHT_FAILED] },
            defaults
        );

        expect(reporting.events).toEqual([EventType.HARNESS_PREFLIGHT_FAILED]);
    });
});
