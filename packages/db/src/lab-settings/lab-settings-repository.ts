import type { LabSettings } from "@openlab/protocol/lab-settings/lab-settings.types";
import { eq } from "drizzle-orm";
import type { Database } from "#src/lab-database/lab-database-client";
import { labSettings } from "#src/lab-database/lab-schema";
import { LAB_SETTINGS_ROW_ID } from "#src/lab-settings/lab-settings.const";

/**
 * Where the lab keeps what the operator set for it. The document is read and written whole: a
 * setting means nothing without the ones beside it, and a partial write would leave the lab in a
 * state no operator asked for.
 */
export class LabSettingsRepository {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    /** What the operator set, or nothing at all for a lab that is still running as shipped. */
    async read(): Promise<LabSettings | undefined> {
        const row = await this.#database.query.labSettings.findFirst({
            where: eq(labSettings.id, LAB_SETTINGS_ROW_ID)
        });
        return row?.settings;
    }

    async write(settings: LabSettings): Promise<LabSettings> {
        const now = new Date();
        const [row] = await this.#database
            .insert(labSettings)
            .values({ id: LAB_SETTINGS_ROW_ID, settings, createdAt: now, updatedAt: now })
            .onConflictDoUpdate({ target: labSettings.id, set: { settings, updatedAt: now } })
            .returning();
        if (row === undefined) {
            throw new Error("Failed to write the lab settings");
        }
        return row.settings;
    }
}
