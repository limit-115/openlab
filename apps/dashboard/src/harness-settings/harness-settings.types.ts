import type { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import type { LabSettings, RoleExecution } from "@openlab/protocol/lab-settings/lab-settings.types";

/**
 * The settings while the operator is still editing them. A roster is allowed to be empty here and
 * nowhere else: emptying it is a step on the way to another one, and only saving asks the lab to
 * accept it.
 */
export interface LabSettingsDraft {
    readonly harness_roster: readonly AgentHarnessKind[];
    readonly role_execution: readonly RoleExecution[];
}

/**
 * What the lab last answered with, beside what the operator has made of it. The two are taken and
 * replaced together, so the page can always say which of its settings the lab is yet to be given.
 */
export interface LabSettingsEdit {
    readonly saved: LabSettings;
    readonly draft: LabSettingsDraft;
}
