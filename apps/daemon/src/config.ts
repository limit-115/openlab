import path from "node:path";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const DatabaseProtocol = {
    POSTGRES: "postgres:",
    POSTGRESQL: "postgresql:"
} as const;

const DatabaseUrlSchema = z
    .url()
    .refine(
        (value) =>
            Object.values(DatabaseProtocol).includes(new URL(value).protocol as DatabaseProtocol),
        "DATABASE_URL must use the postgres or postgresql protocol"
    );

type DatabaseProtocol = (typeof DatabaseProtocol)[keyof typeof DatabaseProtocol];

export interface DaemonOptions {
    taskPath: string;
    host?: string;
    port?: number;
    workspaceRoot?: string;
    databaseUrl?: string;
}

export interface DaemonConfig {
    taskPath: string;
    host: string;
    port: number;
    workspaceRoot: string;
    dashboardRoot: string;
    databaseUrl: string;
}

export function resolveDaemonConfig(options: DaemonOptions): DaemonConfig {
    const environment = createEnv({
        server: {
            LAB_HOST: z.string().min(1).default("127.0.0.1"),
            LAB_PORT: z.coerce.number().int().min(0).max(65535).default(4318),
            LAB_HOME: z.string().min(1).optional(),
            LAB_DASHBOARD_ROOT: z.string().min(1).optional(),
            DATABASE_URL: DatabaseUrlSchema
        },
        runtimeEnv: {
            ...process.env,
            LAB_HOST: options.host ?? process.env.LAB_HOST,
            LAB_PORT: options.port ?? process.env.LAB_PORT,
            LAB_HOME: options.workspaceRoot ?? process.env.LAB_HOME,
            DATABASE_URL: options.databaseUrl ?? process.env.DATABASE_URL
        },
        emptyStringAsUndefined: true
    });

    return {
        taskPath: path.resolve(options.taskPath),
        host: environment.LAB_HOST,
        port: environment.LAB_PORT,
        workspaceRoot: path.resolve(environment.LAB_HOME ?? path.join(process.cwd(), ".lab")),
        dashboardRoot: path.resolve(
            environment.LAB_DASHBOARD_ROOT ??
                path.join(import.meta.dirname, "..", "..", "dashboard", "dist")
        ),
        databaseUrl: environment.DATABASE_URL
    };
}
