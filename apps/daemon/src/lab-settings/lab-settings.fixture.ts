import type { LabSettings } from "@nightlab/protocol/lab-settings/lab-settings.types";
import type { LabSettingsRecords } from "#src/lab-settings/lab-settings.types";

/** The settings row as far as the store is concerned: one document, written whole or absent. */
export class InMemoryLabSettings implements LabSettingsRecords {
    #settings: LabSettings | undefined;

    constructor(settings?: LabSettings) {
        this.#settings = settings;
    }

    async read(): Promise<LabSettings | undefined> {
        return this.#settings === undefined ? undefined : structuredClone(this.#settings);
    }

    async write(settings: LabSettings): Promise<LabSettings> {
        this.#settings = structuredClone(settings);
        return structuredClone(settings);
    }
}
