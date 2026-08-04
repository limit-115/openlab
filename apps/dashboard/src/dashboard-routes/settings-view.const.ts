import { HARNESS_SETTINGS_NAMESPACE } from "#src/harness-settings/harness-settings.i18n";
import { LAB_MAINTENANCE_NAMESPACE } from "#src/lab-maintenance/lab-maintenance.i18n";
import { SUBSCRIPTION_ALLOWANCE_NAMESPACE } from "#src/subscription-allowance/subscription-allowance.i18n";

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
 * it opens, and names it out of that block's own vocabulary, so the two cannot drift apart.
 */
export const SETTINGS_SECTIONS = [
    { section: SettingsSection.HARNESSES, title: `${HARNESS_SETTINGS_NAMESPACE}:title` },
    { section: SettingsSection.SUBSCRIPTIONS, title: `${SUBSCRIPTION_ALLOWANCE_NAMESPACE}:title` },
    { section: SettingsSection.STORAGE, title: `${LAB_MAINTENANCE_NAMESPACE}:title` }
] as const;

/** The vocabularies the tab strip reads from, which are the ones its blocks are written in. */
export const SETTINGS_NAMESPACES = [
    HARNESS_SETTINGS_NAMESPACE,
    SUBSCRIPTION_ALLOWANCE_NAMESPACE,
    LAB_MAINTENANCE_NAMESPACE
] as const;

/** The tabs, then whichever block is open under them, standing clear of the strip that chose it. */
export const SETTINGS_PAGE = "grid gap-6" as const;
