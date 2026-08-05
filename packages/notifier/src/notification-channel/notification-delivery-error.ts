import type { NotificationChannelKind } from "@openlab/protocol/operator-notifications/notification-channel.const";
import type { NotificationDeliveryFailure } from "#src/notification-channel/notification-delivery-error.const";

/**
 * A message that did not arrive, said in terms the operator can act on. The reason is the vendor's
 * own sentence wherever there is one, because "chat not found" tells them which field to fix and
 * "delivery failed" tells them nothing.
 *
 * A channel authenticates with a credential that is often part of the address it calls, so nothing
 * here is ever built out of a request URL: this error is shown on the settings page and written to
 * the daemon log, and both are places a token must not turn up.
 */
export class NotificationDeliveryError extends Error {
    readonly channel: NotificationChannelKind;
    readonly failure: NotificationDeliveryFailure;
    /** What the vendor said, ready to show an operator as it stands. */
    readonly reason: string;

    constructor(
        channel: NotificationChannelKind,
        failure: NotificationDeliveryFailure,
        reason: string,
        options?: ErrorOptions
    ) {
        super(`${channel} notification ${failure}: ${reason}`, options);
        this.name = "NotificationDeliveryError";
        this.channel = channel;
        this.failure = failure;
        this.reason = reason;
    }
}
