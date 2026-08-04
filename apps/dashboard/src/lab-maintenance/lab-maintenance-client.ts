import { LabStorageSchema } from "@lab/protocol/lab-storage/lab-storage.schema";
import type { LabStorage } from "@lab/protocol/lab-storage/lab-storage.types";
import { LabStorageEndpoint } from "#src/lab-maintenance/lab-maintenance.const";

export const labStorageQueryKey = ["lab", "storage"] as const;

export function fetchLabStorage(signal?: AbortSignal): Promise<LabStorage> {
    return requestStorage(LabStorageEndpoint.USAGE, {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });
}

/** Empties the lab and answers with what is left, which is the reading the page then shows. */
export function purgeLabStorage(): Promise<LabStorage> {
    return requestStorage(LabStorageEndpoint.PURGE, {
        method: "POST",
        headers: { Accept: "application/json" }
    });
}

async function requestStorage(url: string, init: RequestInit): Promise<LabStorage> {
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error(`Storage endpoint returned ${response.status}.`);
    }
    return LabStorageSchema.parse(await response.json());
}
