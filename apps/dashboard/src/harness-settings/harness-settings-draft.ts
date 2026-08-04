import {
    AgentEffortLevel,
    type AgentHarnessKind
} from "@lab/protocol/agents/agent-execution.const";
import type { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { DEFAULT_ROLE_EFFORT } from "@lab/protocol/lab-settings/lab-settings.const";
import type { RoleExecution } from "@lab/protocol/lab-settings/lab-settings.types";
import { SELECTABLE_HARNESSES } from "#src/harness-settings/harness-settings.const";
import type { LabSettingsDraft } from "#src/harness-settings/harness-settings.types";

/**
 * The roster keeps the listed order however the boxes are ticked, because that order is the
 * rotation a new investigation inherits.
 */
export function chooseHarness(
    draft: LabSettingsDraft,
    harness: AgentHarnessKind,
    chosen: boolean
): LabSettingsDraft {
    return {
        ...draft,
        harness_roster: SELECTABLE_HARNESSES.filter((candidate) =>
            candidate === harness ? chosen : draft.harness_roster.includes(candidate)
        )
    };
}

export function chooseRoleEffort(
    draft: LabSettingsDraft,
    role: AgentRole,
    effort: AgentEffortLevel
): LabSettingsDraft {
    return withRole(draft, role, (execution) => ({ ...execution, effort }));
}

/**
 * Naming no model is an answer rather than a gap: the harness picks its own, so an emptied field
 * drops the entry instead of asking a vendor to run a model called "".
 */
export function chooseRoleModel(
    draft: LabSettingsDraft,
    role: AgentRole,
    harness: AgentHarnessKind,
    model: string
): LabSettingsDraft {
    const named = model.trim();
    return withRole(draft, role, (execution) => ({
        ...execution,
        models: [
            ...execution.models.filter((entry) => entry.harness !== harness),
            ...(named.length === 0 ? [] : [{ harness, model: named }])
        ].sort((left, right) =>
            SELECTABLE_HARNESSES.indexOf(left.harness) < SELECTABLE_HARNESSES.indexOf(right.harness)
                ? -1
                : 1
        )
    }));
}

/** What a role is set to, including the roles the operator has never touched. */
export function roleExecution(draft: LabSettingsDraft, role: AgentRole): RoleExecution {
    return (
        draft.role_execution.find((execution) => execution.role === role) ?? {
            role,
            effort: DEFAULT_ROLE_EFFORT,
            models: []
        }
    );
}

export function roleModel(
    draft: LabSettingsDraft,
    role: AgentRole,
    harness: AgentHarnessKind
): string {
    return (
        roleExecution(draft, role).models.find((entry) => entry.harness === harness)?.model ?? ""
    );
}

export function isEffort(value: string): value is AgentEffortLevel {
    return Object.values(AgentEffortLevel).includes(value as AgentEffortLevel);
}

function withRole(
    draft: LabSettingsDraft,
    role: AgentRole,
    change: (execution: RoleExecution) => RoleExecution
): LabSettingsDraft {
    const changed = change(roleExecution(draft, role));
    return {
        ...draft,
        role_execution: draft.role_execution.some((execution) => execution.role === role)
            ? draft.role_execution.map((execution) =>
                  execution.role === role ? changed : execution
              )
            : [...draft.role_execution, changed]
    };
}
