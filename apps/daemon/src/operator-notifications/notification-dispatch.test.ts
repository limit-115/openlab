import type { NotificationChannel } from "@nightlab/notifier/notification-channel.types";
import { NotificationDeliveryError } from "@nightlab/notifier/notification-delivery-error";
import { NotificationDeliveryFailure } from "@nightlab/notifier/notification-delivery-error.const";
import type { NotificationMessage } from "@nightlab/notifier/notification-message.types";
import { EventType } from "@nightlab/protocol/investigation-events/event-type.const";
import type { InvestigationEvent } from "@nightlab/protocol/investigation-events/investigation-event.types";
import { InvestigationState } from "@nightlab/protocol/investigation-lifecycle/investigation-state.const";
import { StatusSnapshotSchema } from "@nightlab/protocol/investigation-status/status-snapshot.schema";
import {
    NotificationChannelKind,
    NotificationLanguage
} from "@nightlab/protocol/operator-notifications/notification-channel.const";
import { NotificationSettingsSchema } from "@nightlab/protocol/operator-notifications/notification-settings.schema";
import { describe, expect, it, vi } from "vitest";
import { NotificationDispatch } from "#src/operator-notifications/notification-dispatch";
import { NOTIFICATION_PHRASES } from "#src/operator-notifications/notification-phrasing.const";

const LAB_URL = "http://127.0.0.1:4318";

const SNAPSHOT = StatusSnapshotSchema.parse({
    investigation: {
        id: "investigation-7",
        state: InvestigationState.RUNNING,
        goal: "Find a conservation bug",
        started_at: "2026-08-05T00:00:00.000Z",
        updated_at: "2026-08-05T00:00:00.000Z",
        uptime_ms: 0
    }
});

const BREAKTHROUGH: InvestigationEvent = {
    id: "event-1",
    investigation_id: "investigation-7",
    type: EventType.BREAKTHROUGH_RECORDED,
    occurred_at: "2026-08-05T00:00:00.000Z",
    payload: {}
};

function telegram(overrides: Record<string, unknown> = {}, defaults?: Record<string, unknown>) {
    return NotificationSettingsSchema.parse({
        ...(defaults === undefined ? {} : { defaults }),
        channels: [
            {
                kind: NotificationChannelKind.TELEGRAM,
                enabled: true,
                bot_token: "1234:secret",
                chat_id: "-1001",
                ...overrides
            }
        ]
    });
}

/** Stands in for every vendor: records what the lab decided to send, or refuses it as one would. */
function watching(refusal?: string) {
    const sent: NotificationMessage[] = [];
    const open = vi.fn(
        (): NotificationChannel => ({
            kind: NotificationChannelKind.TELEGRAM,
            deliver: async (message) => {
                if (refusal !== undefined) {
                    throw new NotificationDeliveryError(
                        NotificationChannelKind.TELEGRAM,
                        NotificationDeliveryFailure.REFUSED,
                        refusal
                    );
                }
                sent.push(message);
                return {};
            }
        })
    );
    return { sent, open };
}

function dispatching(
    settings: ReturnType<typeof telegram>,
    channel: ReturnType<typeof watching>,
    onFailure: (error: unknown) => void = () => undefined
) {
    return new NotificationDispatch({
        settings: { read: () => settings },
        labUrl: () => LAB_URL,
        open: channel.open,
        onFailure
    });
}

/** record() launches the delivery and returns; the send lands on the next turn of the loop. */
async function settle(): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
}

describe("NotificationDispatch.record", () => {
    it("tells a switched-on channel about a moment it asked for", async () => {
        const channel = watching();
        dispatching(telegram(), channel).record(BREAKTHROUGH, SNAPSHOT);
        await settle();

        expect(channel.sent).toHaveLength(1);
        expect(channel.sent[0]?.title).toBe(
            NOTIFICATION_PHRASES[NotificationLanguage.EN].titles[EventType.BREAKTHROUGH_RECORDED]
        );
    });

    it("stays quiet through a channel the operator switched off", async () => {
        const channel = watching();
        dispatching(telegram({ enabled: false }), channel).record(BREAKTHROUGH, SNAPSHOT);
        await settle();

        expect(channel.open).not.toHaveBeenCalled();
    });

    it("stays quiet about a moment the channel did not ask for", async () => {
        const channel = watching();
        dispatching(telegram({ events: [EventType.INVESTIGATION_FAILED] }), channel).record(
            BREAKTHROUGH,
            SNAPSHOT
        );
        await settle();

        expect(channel.open).not.toHaveBeenCalled();
    });

    it("writes in the language that channel was configured with", async () => {
        const channel = watching();
        dispatching(telegram({ language: NotificationLanguage.RU }), channel).record(
            BREAKTHROUGH,
            SNAPSHOT
        );
        await settle();

        expect(channel.sent[0]?.title).toBe(
            NOTIFICATION_PHRASES[NotificationLanguage.RU].titles[EventType.BREAKTHROUGH_RECORDED]
        );
    });

    it("writes in the lab's own language to a channel that named none", async () => {
        const channel = watching();
        dispatching(telegram({}, { language: NotificationLanguage.RU }), channel).record(
            BREAKTHROUGH,
            SNAPSHOT
        );
        await settle();

        expect(channel.sent[0]?.title).toBe(
            NOTIFICATION_PHRASES[NotificationLanguage.RU].titles[EventType.BREAKTHROUGH_RECORDED]
        );
    });

    it("stays quiet about a moment the lab dropped, through a channel that named none", async () => {
        const channel = watching();
        dispatching(telegram({}, { events: [EventType.INVESTIGATION_FAILED] }), channel).record(
            BREAKTHROUGH,
            SNAPSHOT
        );
        await settle();

        expect(channel.open).not.toHaveBeenCalled();
    });

    /** Narrowing the lab is not censorship: a channel that asked for a moment still gets it. */
    it("tells a channel about the moment it asked for though the lab dropped it", async () => {
        const channel = watching();
        dispatching(
            telegram(
                { events: [EventType.BREAKTHROUGH_RECORDED] },
                { events: [EventType.INVESTIGATION_FAILED] }
            ),
            channel
        ).record(BREAKTHROUGH, SNAPSHOT);
        await settle();

        expect(channel.sent).toHaveLength(1);
    });

    it("says nothing at all about a moment the lab never offers to report", async () => {
        const channel = watching();
        dispatching(telegram(), channel).record(
            { ...BREAKTHROUGH, type: EventType.RUN_STARTED },
            SNAPSHOT
        );
        await settle();

        expect(channel.sent).toEqual([]);
    });

    /** This hangs off the event stream a research loop writes to. A chat service must not stop it. */
    it("writes a refusing vendor down and leaves the research alone", async () => {
        const failures: unknown[] = [];
        const channel = watching("Bad Request: chat not found");

        expect(() =>
            dispatching(telegram(), channel, (error) => failures.push(error)).record(
                BREAKTHROUGH,
                SNAPSHOT
            )
        ).not.toThrow();
        await settle();

        expect(failures).toHaveLength(1);
        expect(failures[0]).toBeInstanceOf(NotificationDeliveryError);
    });
});

describe("NotificationDispatch.test", () => {
    it("reaches the operator through what the lab has stored", async () => {
        const channel = watching();

        const result = await dispatching(telegram(), channel).test(
            NotificationChannelKind.TELEGRAM
        );

        expect(result).toEqual({ kind: NotificationChannelKind.TELEGRAM, delivered: true });
        expect(channel.sent[0]?.title).toBe(
            NOTIFICATION_PHRASES[NotificationLanguage.EN].testTitle
        );
    });

    /** A test proves the channel, so it has to arrive in the language its messages will. */
    it("writes the test in the lab's own language to a channel that named none", async () => {
        const channel = watching();

        await dispatching(telegram({}, { language: NotificationLanguage.RU }), channel).test(
            NotificationChannelKind.TELEGRAM
        );

        expect(channel.sent[0]?.title).toBe(
            NOTIFICATION_PHRASES[NotificationLanguage.RU].testTitle
        );
    });

    it("hands back the vendor's own words, which name the field to fix", async () => {
        const result = await dispatching(telegram(), watching("Bad Request: chat not found")).test(
            NotificationChannelKind.TELEGRAM
        );

        expect(result).toEqual({
            kind: NotificationChannelKind.TELEGRAM,
            delivered: false,
            reason: "Bad Request: chat not found"
        });
    });

    it("has nothing to try for a channel the lab holds no credentials for", async () => {
        const settings = NotificationSettingsSchema.parse({ channels: [] });
        const channel = watching();

        const dispatch = new NotificationDispatch({
            settings: { read: () => settings },
            labUrl: () => LAB_URL,
            open: channel.open
        });

        expect(await dispatch.test(NotificationChannelKind.TELEGRAM)).toBeUndefined();
    });
});
