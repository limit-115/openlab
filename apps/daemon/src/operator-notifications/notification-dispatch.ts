import { NotificationDeliveryError } from "@nightlab/notifier/notification-delivery-error";
import type {
    DeliveredNotification,
    NotificationMessage
} from "@nightlab/notifier/notification-message.types";
import { EventType } from "@nightlab/protocol/investigation-events/event-type.const";
import type { InvestigationEvent } from "@nightlab/protocol/investigation-events/investigation-event.types";
import type { StatusSnapshot } from "@nightlab/protocol/investigation-status/status-snapshot.types";
import type {
    NotificationChannelKind,
    NotificationLanguage
} from "@nightlab/protocol/operator-notifications/notification-channel.const";
import { channelReporting } from "@nightlab/protocol/operator-notifications/notification-channel-reporting";
import type { NotificationChannel as ConfiguredChannel } from "@nightlab/protocol/operator-notifications/notification-settings.types";
import type { NotificationTestResult } from "@nightlab/protocol/operator-notifications/notification-test.types";
import type { AskedCapability } from "#src/operator-answers/operator-answers.types";
import { openNotificationChannel } from "#src/operator-notifications/notification-channel-roster";
import type {
    NotificationDispatchOptions,
    ReportingChannel
} from "#src/operator-notifications/notification-dispatch.types";
import {
    notificationMessage,
    notificationTestMessage
} from "#src/operator-notifications/notification-phrasing";
import { NotificationPayloadField } from "#src/operator-notifications/notification-phrasing.const";
import type {
    NotificationSettingsReader,
    OpenNotificationChannel
} from "#src/operator-notifications/operator-notifications.types";

/**
 * Tells whoever the operator configured about the moments the lab decided are worth reading. It
 * reads the settings at the moment of the event rather than holding channels open, so switching a
 * channel off silences the very next message without anything being rebuilt.
 *
 * Reporting is something the lab does about its research, never something its research waits on: a
 * message is sent alongside the loop and a vendor that refuses it is written down and left there.
 */
export class NotificationDispatch {
    readonly #settings: NotificationSettingsReader;
    readonly #labUrl: () => string;
    readonly #open: OpenNotificationChannel;
    readonly #onFailure: (error: unknown) => void;
    readonly #onAsked: ((asked: AskedCapability) => void) | undefined;

    constructor(options: NotificationDispatchOptions) {
        this.#settings = options.settings;
        this.#labUrl = options.labUrl;
        this.#open = options.open ?? openNotificationChannel;
        this.#onFailure = options.onFailure ?? (() => undefined);
        this.#onAsked = options.onAsked;
    }

    /**
     * One lab moment, told to every channel that asked for it. Nothing is awaited and nothing is
     * thrown: this hangs off the event stream every investigation writes to, and a research loop
     * must not be held up, or brought down, by a chat service.
     */
    record(event: InvestigationEvent, snapshot: StatusSnapshot): void {
        for (const { configured, language } of this.#reporting(event.type)) {
            const message = notificationMessage(event, snapshot, language, this.#labUrl());
            if (message !== undefined) {
                void this.#deliver(configured, message)
                    .then((delivered) => this.#asked(event, snapshot, delivered))
                    .catch(this.#onFailure);
            }
        }
    }

    /**
     * Says what message a question went out in, so an answer to it can be tied back. Only the lab
     * knows both, and it knows the pair for exactly as long as this call: a delivery that named no
     * message is one nobody can reply to, and there is nothing to remember about it.
     */
    #asked(
        event: InvestigationEvent,
        snapshot: StatusSnapshot,
        delivered: DeliveredNotification
    ): void {
        const capabilityId = event.payload[NotificationPayloadField.REQUEST_ID];
        if (
            this.#onAsked === undefined ||
            event.type !== EventType.CAPABILITY_REQUESTED ||
            typeof capabilityId !== "string" ||
            delivered.reference === undefined
        ) {
            return;
        }
        this.#onAsked({
            investigationId: snapshot.investigation.id,
            capabilityId,
            reference: delivered.reference
        });
    }

    /**
     * Says one thing through one channel, in the language that channel is read in. This is the lab
     * answering rather than reporting: nothing happened, the operator spoke to it, and it is saying
     * what it did with that. A channel nobody configured has nowhere to say it and says nothing.
     */
    async tell(
        kind: NotificationChannelKind,
        write: (language: NotificationLanguage) => NotificationMessage
    ): Promise<void> {
        const { defaults, channels } = this.#settings.read();
        const configured = channels.find((channel) => channel.kind === kind);
        if (configured === undefined) {
            return;
        }
        const { language } = channelReporting(configured, defaults);
        await this.#deliver(configured, write(language));
    }

    /**
     * Sends one channel a message about nothing, so the operator finds out whether the lab can
     * reach them before there is something worth reaching them about. A channel the lab holds no
     * credentials for is not a failed delivery and yields nothing at all.
     */
    async test(kind: NotificationChannelKind): Promise<NotificationTestResult | undefined> {
        const { defaults, channels } = this.#settings.read();
        const configured = channels.find((channel) => channel.kind === kind);
        if (configured === undefined) {
            return undefined;
        }
        const { language } = channelReporting(configured, defaults);
        const message = notificationTestMessage(language, this.#labUrl());
        try {
            await this.#deliver(configured, message);
            return { kind, delivered: true };
        } catch (error) {
            return { kind, delivered: false, reason: refusalReason(error) };
        }
    }

    /**
     * The channels switched on and listening for this moment, in the order they were configured.
     * What a channel listens for is asked of the settings as a whole: a channel that named no
     * moments of its own is listening for whatever the lab currently reports, not for nothing.
     */
    #reporting(type: InvestigationEvent["type"]): readonly ReportingChannel[] {
        const { defaults, channels } = this.#settings.read();
        return channels.flatMap((configured) => {
            if (!configured.enabled) {
                return [];
            }
            const { events, language } = channelReporting(configured, defaults);
            return events.some((reported) => reported === type) ? [{ configured, language }] : [];
        });
    }

    #deliver(
        configured: ConfiguredChannel,
        message: NotificationMessage
    ): Promise<DeliveredNotification> {
        return this.#open(configured).deliver(message);
    }
}

/** The vendor's own sentence where there is one: it names the field the operator has to fix. */
function refusalReason(error: unknown): string {
    if (error instanceof NotificationDeliveryError) {
        return error.reason;
    }
    return error instanceof Error ? error.message : String(error);
}
