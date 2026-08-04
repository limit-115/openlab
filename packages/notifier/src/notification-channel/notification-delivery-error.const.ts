/**
 * Why a message did not arrive. The operator acts on each of these differently: a refusal is theirs
 * to fix, an unreachable service is theirs to wait out, so the two are never collapsed into one.
 */
export const NotificationDeliveryFailure = {
    /** The service answered and said no. Its own words are the useful part. */
    REFUSED: "refused",
    /** The service never answered: the network, the host, or the clock ran out. */
    UNREACHABLE: "unreachable",
    /** The service answered with something that is not its documented shape. */
    UNREADABLE: "unreadable"
} as const;
export type NotificationDeliveryFailure =
    (typeof NotificationDeliveryFailure)[keyof typeof NotificationDeliveryFailure];
