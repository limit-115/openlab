import type { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";
import type { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

export interface StatusServerOptions {
    /** The subscriptions are the lab's, not one investigation's, so the readings are shared. */
    subscriptions?: SubscriptionAllowanceReadings;
    dashboardRoot?: string;
    logLevel?: DaemonLogLevel;
}
