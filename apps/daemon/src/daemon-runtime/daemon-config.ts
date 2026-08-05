import path from "node:path";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { builtDashboardRoot } from "#src/daemon-runtime/built-dashboard";
import { DaemonLogLevel } from "#src/daemon-runtime/daemon-config.const";
import type { DaemonConfig, DaemonOptions } from "#src/daemon-runtime/daemon-config.types";
import { labDatabasePath, resolveLabHome } from "#src/lab-home/lab-home";

export function resolveDaemonConfig(options: DaemonOptions = {}): DaemonConfig {
    const environment = createEnv({
        server: {
            LAB_HOST: z.string().min(1).default("127.0.0.1"),
            LAB_PORT: z.coerce.number().int().min(0).max(65535).default(4318),
            LAB_HOME: z.string().min(1).optional(),
            XDG_DATA_HOME: z.string().min(1).optional(),
            LAB_DASHBOARD_ROOT: z.string().min(1).optional(),
            /**
             * A lab runs in the terminal an operator started it from, so it says only what stops it
             * working. Everything a request did is there for whoever asks for it.
             */
            LAB_LOG_LEVEL: z.enum(DaemonLogLevel).default(DaemonLogLevel.WARN)
        },
        runtimeEnv: {
            ...process.env,
            LAB_HOST: options.host ?? process.env.LAB_HOST,
            LAB_PORT: options.port ?? process.env.LAB_PORT,
            LAB_HOME: options.workspaceRoot ?? process.env.LAB_HOME,
            LAB_LOG_LEVEL: options.logLevel ?? process.env.LAB_LOG_LEVEL
        },
        emptyStringAsUndefined: true
    });
    const workspaceRoot = resolveLabHome(environment);

    return {
        host: environment.LAB_HOST,
        port: environment.LAB_PORT,
        workspaceRoot,
        dashboardRoot: path.resolve(environment.LAB_DASHBOARD_ROOT ?? builtDashboardRoot()),
        databasePath: labDatabasePath(workspaceRoot),
        logLevel: environment.LAB_LOG_LEVEL
    };
}
