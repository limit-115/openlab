import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export function resolveCliConfig(): { apiUrl: string } {
    const environment = createEnv({
        server: {
            NIGHTLAB_API_URL: z.url().default("http://127.0.0.1:4318")
        },
        runtimeEnv: process.env,
        emptyStringAsUndefined: true
    });

    return { apiUrl: environment.NIGHTLAB_API_URL };
}
