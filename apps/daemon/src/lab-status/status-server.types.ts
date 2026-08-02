import type { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";

export interface StatusServerOptions {
    dashboardRoot?: string;
    logLevel?: DaemonLogLevel;
    onStop?: () => Promise<void>;
}
