import { HarnessAllowanceRosterSchema } from "@openlab/protocol/harness-allowance/harness-allowance.schema";
import type { HarnessAllowanceRoster } from "@openlab/protocol/harness-allowance/harness-allowance.types";

const HARNESS_ALLOWANCE_ENDPOINT = "/api/allowances";

/** Tells the daemon to put the reading it is holding aside and ask the vendors again. */
const FRESH_READING_QUERY = "?fresh=1";

export const harnessAllowanceQueryKey = ["lab", "allowances"] as const;

/** Whatever the daemon has. Asking faster than it reads the vendors returns the same answer. */
export function fetchHarnessAllowance(signal?: AbortSignal): Promise<HarnessAllowanceRoster> {
    return requestAllowance(HARNESS_ALLOWANCE_ENDPOINT, signal);
}

/** What the vendors say right now, which is the only thing a refresh can honestly mean. */
export function refreshHarnessAllowance(signal?: AbortSignal): Promise<HarnessAllowanceRoster> {
    return requestAllowance(`${HARNESS_ALLOWANCE_ENDPOINT}${FRESH_READING_QUERY}`, signal);
}

async function requestAllowance(
    url: string,
    signal?: AbortSignal
): Promise<HarnessAllowanceRoster> {
    const response = await fetch(url, {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });

    if (!response.ok) {
        throw new Error(`Allowances endpoint returned ${response.status}.`);
    }

    return HarnessAllowanceRosterSchema.parse(await response.json());
}
