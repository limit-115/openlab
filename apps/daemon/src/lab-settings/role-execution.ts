import type { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import type { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { DEFAULT_ROLE_EFFORT } from "@lab/protocol/lab-settings/lab-settings.const";
import type { LabSettings } from "@lab/protocol/lab-settings/lab-settings.types";
import type { RoleExecution } from "#src/lab-settings/lab-settings.types";

/**
 * What one role runs as on the harness it landed on. A role the operator never configured, or one
 * that names no model for this vendor, is left to the harness default: naming no model is a real
 * answer, and it is the one the lab shipped with.
 */
export function resolveRoleExecution(
    settings: LabSettings,
    role: AgentRole,
    harness: AgentHarnessKind
): RoleExecution {
    const configured = settings.role_execution.find((entry) => entry.role === role);
    const model = configured?.models.find((entry) => entry.harness === harness)?.model;
    return {
        effort: configured?.effort ?? DEFAULT_ROLE_EFFORT,
        ...(model === undefined ? {} : { model })
    };
}
