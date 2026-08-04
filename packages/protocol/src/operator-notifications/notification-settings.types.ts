import type { z } from "zod";
import type {
    NotificationChannelSchema,
    NotificationChannelUpdateSchema,
    NotificationChannelViewSchema,
    NotificationSettingsSchema,
    NotificationSettingsUpdateSchema,
    NotificationSettingsViewSchema,
    TelegramChannelSchema
} from "#src/operator-notifications/notification-settings.schema";

export type TelegramChannel = z.infer<typeof TelegramChannelSchema>;

export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;

/** What the lab serves: every channel it holds, minus the secret each one authenticates with. */
export type NotificationChannelView = z.infer<typeof NotificationChannelViewSchema>;
export type NotificationSettingsView = z.infer<typeof NotificationSettingsViewSchema>;

/** What the operator hands back, where an unnamed secret means the stored one still stands. */
export type NotificationChannelUpdate = z.infer<typeof NotificationChannelUpdateSchema>;
export type NotificationSettingsUpdate = z.infer<typeof NotificationSettingsUpdateSchema>;
