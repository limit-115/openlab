import { HarnessReadinessRosterSchema } from "@nightlab/protocol/harness-readiness/harness-readiness.schema";
import type { HarnessReadinessRoster } from "@nightlab/protocol/harness-readiness/harness-readiness.types";

const HARNESS_READINESS_ENDPOINT = "/api/harnesses";

export const harnessReadinessQueryKey = ["lab", "harnesses"] as const;

/**
 * Asks the lab to run the CLIs on this machine and say what happened. Every answer is taken fresh,
 * because the question is only ever asked by someone who is changing the machine while they read it.
 */
export async function fetchHarnessReadiness(signal?: AbortSignal): Promise<HarnessReadinessRoster> {
    const response = await fetch(HARNESS_READINESS_ENDPOINT, {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });

    if (!response.ok) {
        throw new Error(`Harnesses endpoint returned ${response.status}.`);
    }

    return HarnessReadinessRosterSchema.parse(await response.json());
}
