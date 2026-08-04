import { StatusSnapshotSchema } from "@lab/protocol/investigation-status/status-snapshot.schema";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";

export const statusQueryKey = ["lab", "status"] as const;

export class StatusRequestError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "StatusRequestError";
        this.status = status;
    }
}

export async function fetchStatus(signal?: AbortSignal): Promise<StatusSnapshot> {
    const response = await fetch("/api/status", {
        headers: {
            Accept: "application/json"
        },
        ...(signal ? { signal } : {})
    });

    if (!response.ok) {
        throw new StatusRequestError(
            response.status === 404
                ? "No investigation is running yet. Start one from the CLI."
                : `Status endpoint returned ${response.status}.`,
            response.status
        );
    }

    return StatusSnapshotSchema.parse(await response.json());
}
