import type { NotificationChannelKind } from "@nightlab/protocol/operator-notifications/notification-channel.const";
import type {
    DeliveredNotification,
    NotificationMessage
} from "#src/notification-channel/notification-message.types";

/**
 * One vendor the lab can reach its operator through, already holding the credentials for one
 * recipient. A channel knows how to say something and nothing about what is worth saying: it is
 * handed a finished message, so the lab can grow a second vendor without teaching it the lab.
 *
 * Delivery either happens or throws a NotificationDeliveryError naming what the vendor refused.
 * There is no partial success to report and nothing for a caller to retry on its behalf. What it
 * answers with is how the message may be spoken of afterwards, which is nothing at all for a vendor
 * that only writes.
 */
export interface NotificationChannel {
    readonly kind: NotificationChannelKind;
    deliver(message: NotificationMessage, signal?: AbortSignal): Promise<DeliveredNotification>;
}
