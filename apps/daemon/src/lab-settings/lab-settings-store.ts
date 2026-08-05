import { LabSettingsSchema } from "@nightlab/protocol/lab-settings/lab-settings.schema";
import type { LabSettings } from "@nightlab/protocol/lab-settings/lab-settings.types";
import type { LabSettingsReader, LabSettingsRecords } from "#src/lab-settings/lab-settings.types";

const SHIPPED_SETTINGS = LabSettingsSchema.parse({});

/** The lab as shipped, for a research loop that was handed no settings of its own. */
export const SHIPPED_LAB_SETTINGS: LabSettingsReader = { read: () => SHIPPED_SETTINGS };

/**
 * What the lab is currently set to. Every dispatch decision and every new investigation asks this
 * rather than the database, so a setting the operator changes applies to the next agent the lab
 * sends out without restarting anything.
 */
export class LabSettingsStore implements LabSettingsReader {
    readonly #records: LabSettingsRecords;
    #settings: LabSettings = SHIPPED_SETTINGS;

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
