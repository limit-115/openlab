import type { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import type { RoleExecution } from "@lab/protocol/lab-settings/lab-settings.types";

/**
 * The settings while the operator is still editing them. A roster is allowed to be empty here and
 * nowhere else: emptying it is a step on the way to another one, and only saving asks the lab to
 * accept it.
 */
export interface LabSettingsDraft {
    readonly harness_roster: readonly AgentHarnessKind[];
    readonly role_execution: readonly RoleExecution[];
}
