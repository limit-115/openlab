import { InvestigationDispatchSchema } from "@openlab/protocol/investigation-input/investigation-dispatch.schema";
import type { InvestigationDispatch } from "@openlab/protocol/investigation-input/investigation-dispatch.types";

function dispatchEndpoint(investigationId: string): string {
    return `/api/investigations/${investigationId}/dispatch`;
}

export function investigationDispatchQueryKey(investigationId: string): readonly string[] {
    return ["investigation", investigationId, "dispatch"];
}

export async function fetchInvestigationDispatch(
    investigationId: string,
    signal?: AbortSignal
): Promise<InvestigationDispatch> {
    const response = await fetch(dispatchEndpoint(investigationId), {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });
    if (!response.ok) {
        throw new Error(`Dispatch endpoint returned ${response.status}.`);
    }
    return InvestigationDispatchSchema.parse(await response.json());
}

/**
 * Hands the lab what this investigation should dispatch to from now on, and takes back what it is
 * actually running with. A refusal never leaves the page showing a roster nothing is dispatching by.
 */
export async function saveInvestigationDispatch(
    investigationId: string,
    dispatch: InvestigationDispatch
): Promise<InvestigationDispatch> {
    const response = await fetch(dispatchEndpoint(investigationId), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(dispatch)
    });
    if (!response.ok) {
        throw new Error(`The lab refused the dispatch with ${response.status}.`);
    }
    return InvestigationDispatchSchema.parse(await response.json());
}
