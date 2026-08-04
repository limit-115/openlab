import { StatusSnapshotSchema } from "@lab/protocol/investigation-status/status-snapshot.schema";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { investigationPath } from "#src/investigation-roster/investigation-address";

export function statusQueryKey(investigationId: string) {
    return ["investigation", investigationId, "status"] as const;
}

export class StatusRequestError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "StatusRequestError";
        this.status = status;
    }
}

export async function fetchStatus(
    investigationId: string,
    signal?: AbortSignal
): Promise<StatusSnapshot> {
    const response = await fetch(`${investigationPath(investigationId)}/status`, {
        headers: {
            Accept: "application/json"
        },
        ...(signal ? { signal } : {})
    });

    if (!response.ok) {
        throw new StatusRequestError(
            response.status === 404
                ? "The lab is not holding this investigation any more."
                : `Status endpoint returned ${response.status}.`,
            response.status
        );
    }

    return StatusSnapshotSchema.parse(await response.json());
}
