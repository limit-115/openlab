/** Where the lab is told who to report to, and where a configured channel is tried out. */
export const NotificationRoute = {
    SETTINGS: "/api/notifications",
    TEST: "/api/notifications/test"
} as const;

export const NotificationRequestError = {
    INVALID_SETTINGS: "The notification settings name a channel or a moment the lab cannot report",
    INVALID_TEST: "A test names the channel to send through"
} as const;
