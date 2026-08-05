import { NOTIFIABLE_EVENT_TYPES } from "@lab/protocol/operator-notifications/notifiable-event.const";
import { NotificationLanguage } from "@lab/protocol/operator-notifications/notification-channel.const";

export const NotificationEndpoint = {
    SETTINGS: "/api/notifications",
    TEST: "/api/notifications/test"
} as const;

/** The moments the lab offers to report, in the order the operator reads them down. */
export const REPORTABLE_MOMENTS = NOTIFIABLE_EVENT_TYPES;

export const MESSAGE_LANGUAGES = Object.values(NotificationLanguage);

/** What the lab would do with a channel as it currently stands, which is what its row reports. */
export const ChannelSetupState = {
    NOT_CONFIGURED: "notConfigured",
    CONFIGURED_OFF: "configuredOff",
    CONFIGURED_ON: "configuredOn"
} as const;
export type ChannelSetupState = (typeof ChannelSetupState)[keyof typeof ChannelSetupState];

/**
 * A channel nobody has filled in is not a fault, so it stays quiet in a list where most channels
 * never will be; a channel that would actually write carries the one colour worth spotting from
 * across a long list.
 */
export const CHANNEL_SETUP_TONE = {
    [ChannelSetupState.NOT_CONFIGURED]: "outline",
    [ChannelSetupState.CONFIGURED_OFF]: "secondary",
    [ChannelSetupState.CONFIGURED_ON]: "success"
} as const;

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
 * A channel is one row of a list that grows to every place the lab can write, so the row is read
 * down a column rather than across: the arrow that opens it starts every row on the left, the name
 * and what the lab would do with it follow, and the switch ends every row on the right. Setting one
 * up is a once-off, and after that the useful reading is that one line.
 */
export const CHANNEL_HEADING =
    "flex items-center gap-x-4 pr-4 transition-colors hover:bg-muted/40" as const;

/**
 * The arrow leads the row instead of trailing it, so it cannot be mistaken for the switch it would
 * otherwise sit beside. Reversing the row is what moves it: the trigger draws its own arrow after
 * whatever it is given, and the two controls belong at opposite ends of the row.
 */
export const CHANNEL_TRIGGER =
    "flex-row-reverse items-center justify-end gap-3 py-3 hover:no-underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 **:data-[slot=accordion-trigger-icon]:ml-0" as const;
export const CHANNEL_TRIGGER_TEXT =
    "flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5" as const;
export const CHANNEL_NAME = "font-medium" as const;
export const CHANNEL_SWITCH = "ml-auto shrink-0" as const;

/**
 * What the row opens onto starts under the channel's name rather than under the arrow that opened
 * it, so an open channel reads as one block hanging off its own heading instead of as a page that
 * happens to follow a list.
 */
export const CHANNEL_CONTENT = "grid gap-6 pt-1 pl-7" as const;

/**
 * What the channel reports stands apart from what it is: the credentials are entered once and the
 * settings under this rule are the ones an operator comes back to.
 */
export const CHANNEL_REPORTING = "grid gap-6 border-t pt-5" as const;

/**
 * The two credentials sit side by side on a wide screen: they are copied from the same place at the
 * same time, and reading one under the other makes the pair look like unrelated settings. Neither
 * is long enough to earn half of a very wide panel, so the pair stops before the panel does.
 *
 * Each keeps its own height rather than being drawn out to its neighbour's. One hint runs longer
 * than the other, and a field stretched to match it pays for the difference by spacing its label off
 * its box — which is the pair sitting crooked beside each other.
 */
export const CREDENTIAL_FIELDS = "grid max-w-4xl items-start gap-4 sm:grid-cols-2" as const;
export const FIELD = "grid gap-2" as const;

/**
 * Whatever decides where a setting comes from sits against its label rather than across the panel
 * from it. On a wide screen the two are the same statement, and a control flung to the far edge is
 * read as belonging to nothing.
 */
export const FIELD_HEADING = "flex flex-wrap items-center gap-x-3 gap-y-1.5" as const;
export const FIELD_LABEL = "text-sm font-medium" as const;
export const FIELD_HINT = "max-w-3xl text-sm text-muted-foreground" as const;

/**
 * Whether a channel is taking the lab's word for this. Following is the ordinary state, so it is
 * stated rather than controlled, and what the operator is offered is the one move away from it —
 * named by what it does, because two channels' worth of identical switches say nothing about which
 * question either of them answers.
 */
export const SETTING_SOURCE = "flex flex-wrap items-center gap-x-1 gap-y-1" as const;
export const SETTING_SOURCE_STATE = "text-sm font-normal text-muted-foreground" as const;

/**
 * What the lab is answering on the channel's behalf, shown in full rather than counted: the
 * operator is deciding whether to disagree with it, which they cannot do without reading it. It is
 * drawn as a list rather than as ticks, because a tick is what the control above it uses and a
 * statement that mimics a control invites a click that does nothing.
 */
export const FOLLOWED_MOMENTS =
    "max-w-xl list-disc space-y-1 pl-5 text-sm text-muted-foreground" as const;
export const FOLLOWED_SETTING = "text-sm text-muted-foreground" as const;

/**
 * One moment per line rather than in columns. They are sentences rather than labels, and a two
 * column list of sentences is read as a grid of fragments; a row that runs the whole of a wide
 * panel for a sentence's worth of words is read as a broken one.
 */
export const MOMENT_OPTIONS = "grid max-w-xl gap-2" as const;
export const MOMENT_OPTION =
    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-muted/50" as const;
export const MOMENT_OPTION_CHOSEN = "border-primary/50 bg-primary/10 hover:bg-primary/15" as const;

export const LANGUAGE_OPTION =
    "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary data-[state=on]:hover:text-primary-foreground" as const;

/** The test stands apart from the fields it exercises, under the rule that closes the card. */
export const TEST_CONTROL = "flex flex-wrap items-center gap-3 border-t pt-5" as const;
export const TEST_DELIVERED = "flex items-center gap-1.5 text-sm text-primary [&_svg]:size-4";
export const TEST_REFUSED = "text-sm text-destructive" as const;
