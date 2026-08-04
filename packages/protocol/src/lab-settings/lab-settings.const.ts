import { AgentEffortLevel } from "#src/agents/agent-execution.const";
import { AgentRole } from "#src/agents/agent-role.const";
import { domainValues } from "#src/finite-domain/finite-domain-values";

/**
 * The effort a role runs at until the operator names one. It is what every harness already falls
 * back to, so a lab that has never been configured behaves exactly as it did before settings
 * existed.
 */
export const DEFAULT_ROLE_EFFORT = AgentEffortLevel.MEDIUM;

/**
 * Every role at the effort its harness would have chosen anyway and on no named model. Naming no
 * model is the whole point of the default: the harness picks, and only an operator who says
 * otherwise moves a role off it.
 */
export const DEFAULT_ROLE_EXECUTION = domainValues(AgentRole).map((role) => ({
    role,
    effort: DEFAULT_ROLE_EFFORT,
    models: []
}));

export const LabSettingsRefusal = {
    DUPLICATE_HARNESS: "A harness appears once in the roster",
    DUPLICATE_ROLE: "A role is configured once",
    DUPLICATE_ROLE_MODEL: "A role names one model per harness"
} as const;
