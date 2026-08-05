import type { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";
import type { HarnessReadinessChecks } from "#src/harness-readiness/harness-readiness-checks";
import type { LabSettingsStore } from "#src/lab-settings/lab-settings-store";
import type { NotificationDispatch } from "#src/operator-notifications/notification-dispatch";
import type { NotificationSettingsStore } from "#src/operator-notifications/notification-settings-store";
import type { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

/**
 * Who the lab reports to, and the thing that does the reporting. They arrive together because the
 * page that sets one is the page that tries the other out.
 */
export interface NotificationServerOptions {
    readonly settings: NotificationSettingsStore;
    readonly dispatch: NotificationDispatch;
}

export interface StatusServerOptions {
    /** The subscriptions are the lab's, not one investigation's, so the readings are shared. */
    subscriptions?: SubscriptionAllowanceReadings;
    /** Whether the CLIs on this machine can run. Without it the lab cannot be set up from a page. */
    harnesses?: HarnessReadinessChecks;
    /** What the operator set for the lab. Without it the lab answers on its shipped defaults. */
    settings?: LabSettingsStore;
    /** Who the lab tells about its moments. Without it the lab reports to nobody and says so. */
    notifications?: NotificationServerOptions;
    /** Where the run directories live. Without it the lab does not report or purge its disk. */
    workspaceRoot?: string;
    dashboardRoot?: string;
    logLevel?: DaemonLogLevel;
}
