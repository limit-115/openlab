import { NOTIFIABLE_EVENT_TYPES } from "@lab/protocol/operator-notifications/notifiable-event.const";
import { NotificationLanguage } from "@lab/protocol/operator-notifications/notification-channel.const";

export const NotificationEndpoint = {
    SETTINGS: "/api/notifications",
    TEST: "/api/notifications/test"
} as const;

/** The moments the lab offers to report, in the order the operator reads them down. */
export const REPORTABLE_MOMENTS = NOTIFIABLE_EVENT_TYPES;

export const MESSAGE_LANGUAGES = Object.values(NotificationLanguage);

/**
 * What the lab reports, then the channels that may disagree with it, then the one control that
 * hands the whole document over. The order is the argument: the operator settles what is worth
 * saying once, and only then decides whether any single recipient wants something else.
 */
export const NOTIFICATIONS_FORM = "grid gap-6" as const;
export const NOTIFICATIONS_FAILURE = "text-sm text-destructive" as const;
export const NOTIFICATIONS_SAVED =
    "flex items-center gap-1.5 text-sm text-muted-foreground [&_svg]:size-4" as const;
export const NOTIFICATIONS_ACTIONS =
    "flex flex-wrap items-center justify-end gap-x-4 gap-y-2" as const;
export const NOTIFICATIONS_PENDING =
    "flex items-center gap-2 text-sm text-muted-foreground" as const;

export const SHARED_SETTINGS_CONTENT = "grid gap-6" as const;
export const CHANNELS_HEADING = "grid gap-1.5" as const;
export const CHANNELS_TITLE = "text-sm font-medium" as const;

/**
 * A channel is a heading the operator opens rather than a card standing permanently open. Setting
 * one up is a once-off, and after that the useful reading is the one line saying what it does.
 */
export const CHANNEL_HEADING = "flex items-start gap-x-4 pr-4" as const;
export const CHANNEL_TRIGGER = "items-center hover:no-underline" as const;
export const CHANNEL_TRIGGER_TEXT = "flex flex-wrap items-center gap-x-3 gap-y-1.5" as const;
export const CHANNEL_STATUS = "text-sm font-normal text-muted-foreground" as const;
export const CHANNEL_SWITCH =
    "flex shrink-0 cursor-pointer items-center gap-3 self-center text-sm font-medium" as const;
export const CHANNEL_CONTENT = "grid gap-6" as const;

/**
 * The two credentials sit side by side on a wide screen: they are copied from the same place at the
 * same time, and reading one under the other makes the pair look like unrelated settings.
 */
export const CREDENTIAL_FIELDS = "grid gap-4 sm:grid-cols-2" as const;
export const FIELD = "grid gap-2" as const;
export const FIELD_HEADING =
    "flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5" as const;
export const FIELD_LABEL = "text-sm font-medium" as const;
export const FIELD_HINT = "text-sm text-muted-foreground" as const;

/**
 * Whether a channel is taking the lab's word for this. It sits on the field's own heading rather
 * than above the card, because the two questions are answered one at a time: a second recipient
 * commonly wants everything the lab reports, in another language.
 */
export const FOLLOWS_LAB_SWITCH =
    "flex cursor-pointer items-center gap-2.5 text-sm font-normal text-muted-foreground" as const;

/**
 * What the lab is answering on the channel's behalf, shown in full rather than counted. The
 * operator is deciding whether to disagree with it, which they cannot do without reading it.
 */
export const FOLLOWED_SETTING = "grid gap-1 text-sm text-muted-foreground" as const;
export const FOLLOWED_MOMENT = "flex items-start gap-2 [&_svg]:mt-0.5 [&_svg]:size-4" as const;

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
