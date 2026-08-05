import type { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";

export interface DaemonOptions {
    host?: string;
    port?: number;
    workspaceRoot?: string;
}

export interface DaemonConfig {
    host: string;
    port: number;
    workspaceRoot: string;
    dashboardRoot: string;
    databasePath: string;
    logLevel: DaemonLogLevel;
}
