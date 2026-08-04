import { InvestigationSummarySchema } from "@lab/protocol/investigation-status/investigation-summary.schema";
import type { InvestigationSummary } from "@lab/protocol/investigation-status/investigation-summary.types";
import { StatusSnapshotSchema } from "@lab/protocol/investigation-status/status-snapshot.schema";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { investigationPath } from "#src/investigation-roster/investigation-address";
import {
    INVESTIGATIONS_ENDPOINT,
    ROSTER_UNREACHABLE
} from "#src/investigation-roster/investigation-roster.const";
import type { NewInvestigation } from "#src/investigation-roster/investigation-roster.types";

export const investigationRosterQueryKey = ["investigations"] as const;

export async function fetchInvestigationRoster(
    signal?: AbortSignal
): Promise<InvestigationSummary[]> {
    const response = await request(INVESTIGATIONS_ENDPOINT, {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });
    return InvestigationSummarySchema.array().parse(await response.json());
}

/** Starts an investigation. The lab answers with the snapshot it opened, id and all. */
export async function createInvestigation(input: NewInvestigation): Promise<StatusSnapshot> {
    const response = await request(INVESTIGATIONS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(input)
    });
    return StatusSnapshotSchema.parse(await response.json());
}

/** Discards an investigation for good: its history and its run directory go with it. */
export async function discardInvestigation(investigationId: string): Promise<void> {
    await request(investigationPath(investigationId), {
        method: "DELETE",
        headers: { Accept: "application/json" }
    });
}

async function request(url: string, init: RequestInit): Promise<Response> {
    let response: Response;
    try {
        response = await fetch(url, init);
    } catch {
        throw new Error(ROSTER_UNREACHABLE);
    }
    if (!response.ok) {
        throw new Error(
            refusal(await readBody(response)) ?? `The lab answered ${response.status}.`
        );
    }
    return response;
}

async function readBody(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return undefined;
    }
}

function refusal(payload: unknown): string | undefined {
    if (typeof payload === "object" && payload !== null && "error" in payload) {
        return String(payload.error);
    }
    return undefined;
}
