import type { LabSettingsRepository } from "@openlab/db/lab-settings/lab-settings-repository";
import type { AgentEffortLevel } from "@openlab/protocol/agents/agent-execution.const";
import type { LabSettings } from "@openlab/protocol/lab-settings/lab-settings.types";

export type LabSettingsRecords = Pick<LabSettingsRepository, "read" | "write">;

/** What the lab is set to right now, without a database round trip in the dispatch path. */
export interface LabSettingsReader {
    read(): LabSettings;
}

/** One agent session as the settings resolve it. No model means the harness picks its own. */
export interface RoleExecution {
    readonly effort: AgentEffortLevel;
    readonly model?: string;
}
