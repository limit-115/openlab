import path from "node:path";
import { z } from "zod";

const EnvironmentSchema = z.object({
    LAB_HOST: z.string().min(1).default("127.0.0.1"),
    LAB_PORT: z.coerce.number().int().min(1).max(65535).default(4318),
    LAB_HOME: z.string().min(1).optional(),
    LAB_DASHBOARD_ROOT: z.string().min(1).optional()
});

export interface DaemonOptions {
    taskPath: string;
    host?: string;
    port?: number;
    workspaceRoot?: string;
}

export interface DaemonConfig {
    taskPath: string;
    host: string;
    port: number;
    workspaceRoot: string;
    dashboardRoot: string;
}

export function resolveDaemonConfig(options: DaemonOptions): DaemonConfig {
    const environment = EnvironmentSchema.parse(process.env);

    return {
        taskPath: path.resolve(options.taskPath),
        host: options.host ?? environment.LAB_HOST,
        port: options.port ?? environment.LAB_PORT,
        workspaceRoot: path.resolve(
            options.workspaceRoot ?? environment.LAB_HOME ?? path.join(process.cwd(), ".lab")
        ),
        dashboardRoot: path.resolve(
            environment.LAB_DASHBOARD_ROOT ??
                path.join(import.meta.dirname, "..", "..", "dashboard", "dist")
        )
    };
}
