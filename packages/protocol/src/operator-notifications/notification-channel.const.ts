/**
 * Every way the lab can reach the operator who is not watching the dashboard. A channel is the
 * vendor a message is carried by rather than a kind of message: what is worth saying is decided by
 * the lab and says the same thing wherever it is sent.
 */
export const NotificationChannelKind = {
    TELEGRAM: "telegram"
} as const;
export type NotificationChannelKind =
    (typeof NotificationChannelKind)[keyof typeof NotificationChannelKind];

/**
 * The language the lab writes its messages in. This is not the dashboard's own language: that one
 * is a preference of the browser currently looking at the lab, and a message is sent to somebody
 * who may have no browser open at all, so the lab has to be told which language to write in.
 */
export const NotificationLanguage = {
    EN: "en",
    RU: "ru"
} as const;
export type NotificationLanguage = (typeof NotificationLanguage)[keyof typeof NotificationLanguage];
