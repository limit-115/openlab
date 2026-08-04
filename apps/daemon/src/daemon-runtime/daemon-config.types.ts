import type { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";

export interface DaemonOptions {
    host?: string;
    port?: number;
    workspaceRoot?: string;
    databaseUrl?: string;
}

export interface DaemonConfig {
    host: string;
    port: number;
    workspaceRoot: string;
    dashboardRoot: string;
    databaseUrl: string;
    logLevel: DaemonLogLevel;
}
