import { z } from "zod";
import { AgentEffortLevel, AgentHarnessKind } from "#src/agents/agent-execution.const";
import { AgentRole } from "#src/agents/agent-role.const";
import { DEFAULT_HARNESS_KINDS } from "#src/investigation-input/investigation-input.const";
import {
    DEFAULT_ROLE_EFFORT,
    DEFAULT_ROLE_EXECUTION,
    LabSettingsRefusal
} from "#src/lab-settings/lab-settings.const";
import { SpendCapsSchema } from "#src/spend-caps/spend-cap.schema";

function distinct(values: readonly string[]): boolean {
    return new Set(values).size === values.length;
}

/**
 * The model one role runs on one harness. Vendors share no model vocabulary, so the name is the
 * vendor's own and a role that names none is left to the harness default.
 */
export const HarnessModelSchema = z.object({
    harness: z.enum(AgentHarnessKind),
    model: z.string().trim().min(1)
});

/**
 * How the lab runs one role. Effort crosses the vendors unchanged, so it is set once for the role;
 * the model cannot, so it is set per harness the role may land on.
 */
export const RoleExecutionSchema = z.object({
    role: z.enum(AgentRole),
    effort: z.enum(AgentEffortLevel).default(DEFAULT_ROLE_EFFORT),
    models: z
        .array(HarnessModelSchema)
        .default([])
        .refine(
            (models) => distinct(models.map(({ harness }) => harness)),
            LabSettingsRefusal.DUPLICATE_ROLE_MODEL
        )
});

/**
 * What the operator sets for the lab itself rather than for one investigation. Parsing an empty
 * document yields the lab as shipped, so a daemon that has never been configured and one that was
 * reset to defaults are the same lab.
 */
export const LabSettingsSchema = z.object({
    /** What a new investigation starts with, in the order dispatch rotates through it. */
    harness_roster: z
        .array(z.enum(AgentHarnessKind))
        .nonempty()
        .refine(distinct, LabSettingsRefusal.DUPLICATE_HARNESS)
        .default([...DEFAULT_HARNESS_KINDS]),
    role_execution: z
        .array(RoleExecutionSchema)
        .default(DEFAULT_ROLE_EXECUTION)
        .refine(
            (roles) => distinct(roles.map(({ role }) => role)),
            LabSettingsRefusal.DUPLICATE_ROLE
        ),
    /**
     * How far into each subscription window the lab may spend before it stops dispatching there. A
     * window nobody capped is left out, so a lab that has never been given a cap spends every
     * subscription as far as its vendor will serve it.
     */
    spend_caps: SpendCapsSchema.default([])
});
