import { HARNESS_SETTINGS_TITLE } from "#src/harness-settings/harness-settings.const";
import { STORAGE_TITLE } from "#src/lab-maintenance/lab-maintenance.const";
import { ALLOWANCE_SECTION_TITLE } from "#src/subscription-allowance/subscription-allowance-section.const";

/**
 * The blocks the lab itself is read and set through. They are panels of one page rather than
 * addresses, and only the open one is on screen, so a block asks the daemon for its readings when
 * somebody is actually looking at them.
 */
export const SettingsSection = {
    HARNESSES: "harnesses",
    SUBSCRIPTIONS: "subscriptions",
    STORAGE: "storage"
} as const;
export type SettingsSection = (typeof SettingsSection)[keyof typeof SettingsSection];

/**
 * The blocks the settings page offers, in the order its tabs list them. A tab is named by the block
 * it opens, so the two cannot drift apart.
 */
export const SETTINGS_SECTIONS = [
    { section: SettingsSection.HARNESSES, label: HARNESS_SETTINGS_TITLE },
    { section: SettingsSection.SUBSCRIPTIONS, label: ALLOWANCE_SECTION_TITLE },
    { section: SettingsSection.STORAGE, label: STORAGE_TITLE }
] as const;

/** The tabs, then whichever block is open under them, standing clear of the strip that chose it. */
export const SETTINGS_PAGE = "grid gap-6" as const;
