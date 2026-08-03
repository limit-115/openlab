import path from "node:path";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export interface PurgeConfig {
    readonly workspaceRoot: string;
    readonly databaseUrl: string;
}

/**
 * Resolved on demand rather than at module load, because every other command works without a
 * database and must keep starting when DATABASE_URL is unset.
 */
export function resolvePurgeConfig(): PurgeConfig {
    const environment = createEnv({
        server: {
            LAB_HOME: z.string().min(1).optional(),
            DATABASE_URL: z.url()
        },
        runtimeEnv: process.env,
        emptyStringAsUndefined: true
    });

    return {
        workspaceRoot: path.resolve(environment.LAB_HOME ?? path.join(process.cwd(), ".lab")),
        databaseUrl: environment.DATABASE_URL
    };
}
