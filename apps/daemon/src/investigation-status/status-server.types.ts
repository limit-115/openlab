import type { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";
import type { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

export interface StatusServerOptions {
    /** Serving the live agent stream needs the hub the research loop publishes to. */
    activity?: AgentActivityHub;
    /** The same readings the dispatch gate gets, so an operator sees what the lab decided on. */
    subscriptions?: SubscriptionAllowanceReadings;
    dashboardRoot?: string;
    logLevel?: DaemonLogLevel;
    /** Both controls give up the cycle in flight; only the state the lab settles in differs. */
    onPause?: () => Promise<void>;
    onStop?: () => Promise<void>;
}
