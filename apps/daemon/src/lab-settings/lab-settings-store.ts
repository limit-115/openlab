import { LabSettingsSchema } from "@lab/protocol/lab-settings/lab-settings.schema";
import type { LabSettings } from "@lab/protocol/lab-settings/lab-settings.types";
import type { LabSettingsRecords } from "#src/lab-settings/lab-settings.types";

/**
 * What the lab is currently set to. Every dispatch decision and every new investigation asks this
 * rather than the database, so a setting the operator changes applies to the next agent the lab
 * sends out without restarting anything.
 */
export class LabSettingsStore {
    readonly #records: LabSettingsRecords;
    #settings: LabSettings = LabSettingsSchema.parse({});

    constructor(records: LabSettingsRecords) {
        this.#records = records;
    }

    /**
     * Takes up what the operator set, once, as the lab opens. A stored document this version can no
     * longer read leaves the shipped defaults standing rather than the lab: the settings page then
     * shows what is actually in force, which is the operator's cue to set them again.
     */
    async load(): Promise<LabSettings> {
        const stored = await this.#records.read();
        if (stored === undefined) {
            return this.#settings;
        }
        const parsed = LabSettingsSchema.safeParse(stored);
        if (parsed.success) {
            this.#settings = parsed.data;
        }
        return this.#settings;
    }

    read(): LabSettings {
        return this.#settings;
    }

    async write(settings: LabSettings): Promise<LabSettings> {
        this.#settings = await this.#records.write(settings);
        return this.#settings;
    }
}
