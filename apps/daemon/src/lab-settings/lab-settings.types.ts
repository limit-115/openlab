import type { LabSettingsRepository } from "@lab/db/lab-settings/lab-settings-repository";

export type LabSettingsRecords = Pick<LabSettingsRepository, "read" | "write">;
