import type { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";

export interface StatusServerOptions {
    /** Serving the live agent stream needs the hub the research loop publishes to. */
    activity?: AgentActivityHub;
    dashboardRoot?: string;
    logLevel?: DaemonLogLevel;
    onStop?: () => Promise<void>;
}
