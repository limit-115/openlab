import type { HarnessKind } from "@lab/harness/agent-harness.const";
import type { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";

export interface DaemonOptions {
    taskPath: string;
    host?: string;
    port?: number;
    workspaceRoot?: string;
    databaseUrl?: string;
    harnessKinds?: readonly HarnessKind[];
}

export interface DaemonConfig {
    taskPath: string;
    host: string;
    port: number;
    workspaceRoot: string;
    dashboardRoot: string;
    databaseUrl: string;
    logLevel: DaemonLogLevel;
    harnessKinds: readonly HarnessKind[];
}
