import { NOTIFIABLE_EVENT_TYPES } from "@lab/protocol/operator-notifications/notifiable-event.const";
import { NotificationLanguage } from "@lab/protocol/operator-notifications/notification-channel.const";

export const NotificationEndpoint = {
    SETTINGS: "/api/notifications",
    TEST: "/api/notifications/test"
} as const;

/** The moments the lab offers to report, in the order the operator reads them down. */
export const REPORTABLE_MOMENTS = NOTIFIABLE_EVENT_TYPES;

export const MESSAGE_LANGUAGES = Object.values(NotificationLanguage);

/** The channels, then the one control that hands the whole document over. */
export const NOTIFICATIONS_FORM = "grid gap-4" as const;
export const NOTIFICATIONS_FAILURE = "text-sm text-destructive" as const;
export const NOTIFICATIONS_SAVED =
    "flex items-center justify-end gap-1.5 text-sm text-muted-foreground [&_svg]:size-4" as const;
export const NOTIFICATIONS_ACTIONS = "flex flex-wrap items-center justify-end gap-3" as const;
export const NOTIFICATIONS_PENDING =
    "flex items-center gap-2 text-sm text-muted-foreground" as const;

/**
 * A channel is off until it is switched on, so the switch sits in the card's heading beside the
 * vendor's name rather than among the fields: it governs the card rather than being one of them.
 */
export const CHANNEL_CARD = "gap-5" as const;
export const CHANNEL_HEADING =
    "flex flex-wrap items-start justify-between gap-x-6 gap-y-2" as const;
export const CHANNEL_HEADING_TEXT = "grid gap-1.5" as const;
export const CHANNEL_SWITCH = "flex cursor-pointer items-center gap-3 text-sm font-medium" as const;
export const CHANNEL_STATUS = "text-sm text-muted-foreground" as const;
export const CHANNEL_CONTENT = "grid gap-6" as const;

/**
 * The two credentials sit side by side on a wide screen: they are copied from the same place at the
 * same time, and reading one under the other makes the pair look like unrelated settings.
 */
export const CREDENTIAL_FIELDS = "grid gap-4 sm:grid-cols-2" as const;
export const FIELD = "grid gap-2" as const;
export const FIELD_LABEL = "text-sm font-medium" as const;
export const FIELD_HINT = "text-sm text-muted-foreground" as const;

/**
 * One moment per line rather than in columns. They are sentences rather than labels, and a two
 * column list of sentences is read as a grid of fragments.
 */
export const MOMENT_OPTIONS = "grid gap-2" as const;
export const MOMENT_OPTION =
    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-muted/50" as const;
export const MOMENT_OPTION_CHOSEN = "border-primary/50 bg-primary/10 hover:bg-primary/15" as const;

export const LANGUAGE_OPTION =
    "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary data-[state=on]:hover:text-primary-foreground" as const;

/** The test stands apart from the fields it exercises, under the rule that closes the card. */
export const TEST_CONTROL = "flex flex-wrap items-center gap-3 border-t pt-5" as const;
export const TEST_DELIVERED = "flex items-center gap-1.5 text-sm text-primary [&_svg]:size-4";
export const TEST_REFUSED = "text-sm text-destructive" as const;
