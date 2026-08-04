import { LabSettingsSchema } from "@lab/protocol/lab-settings/lab-settings.schema";
import type { LabSettings } from "@lab/protocol/lab-settings/lab-settings.types";
import { LAB_SETTINGS_ENDPOINT } from "#src/harness-settings/harness-settings.const";

export const labSettingsQueryKey = ["lab", "settings"] as const;

export async function fetchLabSettings(signal?: AbortSignal): Promise<LabSettings> {
    const response = await fetch(LAB_SETTINGS_ENDPOINT, {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });
    if (!response.ok) {
        throw new Error(`Settings endpoint returned ${response.status}.`);
    }
    return LabSettingsSchema.parse(await response.json());
}

/**
 * Puts the whole document, and takes back what the lab is running on from that moment. The answer
 * is the lab's own reading rather than what was sent, so a refusal never leaves the page showing
 * settings nothing is dispatching by.
 */
export async function saveLabSettings(settings: LabSettings): Promise<LabSettings> {
    const response = await fetch(LAB_SETTINGS_ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(settings)
    });
    if (!response.ok) {
        throw new Error(`The lab refused the settings with ${response.status}.`);
    }
    return LabSettingsSchema.parse(await response.json());
}
