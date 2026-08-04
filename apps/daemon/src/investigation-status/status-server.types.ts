import type { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";
import type { LabSettingsStore } from "#src/lab-settings/lab-settings-store";
import type { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

export interface StatusServerOptions {
    /** The subscriptions are the lab's, not one investigation's, so the readings are shared. */
    subscriptions?: SubscriptionAllowanceReadings;
    /** What the operator set for the lab. Without it the lab answers on its shipped defaults. */
    settings?: LabSettingsStore;
    /** Where the run directories live. Without it the lab does not report or purge its disk. */
    workspaceRoot?: string;
    dashboardRoot?: string;
    logLevel?: DaemonLogLevel;
}
