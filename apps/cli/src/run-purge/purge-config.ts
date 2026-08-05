import { resolveLabHome } from "@openlab/daemon/lab-home/lab-home";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export interface PurgeConfig {
    readonly workspaceRoot: string;
}

/** Which lab home a purge is about. Its database is inside it, so there is nothing else to find. */
export function resolvePurgeConfig(): PurgeConfig {
    const environment = createEnv({
        server: {
            OPENLAB_HOME: z.string().min(1).optional(),
            XDG_DATA_HOME: z.string().min(1).optional()
        },
        runtimeEnv: process.env,
        emptyStringAsUndefined: true
    });

    return {
        workspaceRoot: resolveLabHome(environment)
    };
}
