import { describe, expect, it } from "vitest";
import { AgentEffortLevel, AgentHarnessKind } from "#src/agents/agent-execution.const";
import { AgentRole } from "#src/agents/agent-role.const";
import { DEFAULT_HARNESS_KINDS } from "#src/investigation-input/investigation-input.const";
import { DEFAULT_ROLE_EFFORT } from "#src/lab-settings/lab-settings.const";
import { LabSettingsSchema } from "#src/lab-settings/lab-settings.schema";

describe("LabSettingsSchema", () => {
    it("reads an unconfigured lab as the shipped roster with every role on its harness default", () => {
        const settings = LabSettingsSchema.parse({});

        expect(settings.harness_roster).toEqual([...DEFAULT_HARNESS_KINDS]);
        expect(settings.role_execution).toEqual(
            Object.values(AgentRole).map((role) => ({
                role,
                effort: DEFAULT_ROLE_EFFORT,
                models: []
            }))
        );
    });

    it("keeps a role on the model and effort the operator set for it", () => {
        const settings = LabSettingsSchema.parse({
            role_execution: [
                {
                    role: AgentRole.DIRECTOR,
                    effort: AgentEffortLevel.MAX,
                    models: [{ harness: AgentHarnessKind.CLAUDE, model: "opus" }]
                }
            ]
        });

        expect(settings.role_execution).toEqual([
            {
                role: AgentRole.DIRECTOR,
                effort: AgentEffortLevel.MAX,
                models: [{ harness: AgentHarnessKind.CLAUDE, model: "opus" }]
            }
        ]);
    });

    it("refuses two models for one role on the same harness, which names no winner", () => {
        expect(() =>
            LabSettingsSchema.parse({
                role_execution: [
                    {
                        role: AgentRole.RESEARCHER,
                        models: [
                            { harness: AgentHarnessKind.CLAUDE, model: "opus" },
                            { harness: AgentHarnessKind.CLAUDE, model: "sonnet" }
                        ]
                    }
                ]
            })
        ).toThrow();
    });

    it("refuses one role configured twice, which names no winner either", () => {
        expect(() =>
            LabSettingsSchema.parse({
                role_execution: [
                    { role: AgentRole.VERIFIER, effort: AgentEffortLevel.LOW },
                    { role: AgentRole.VERIFIER, effort: AgentEffortLevel.HIGH }
                ]
            })
        ).toThrow();
    });

    it("refuses a harness listed twice in the roster, which would weight the rotation", () => {
        expect(() =>
            LabSettingsSchema.parse({
                harness_roster: [AgentHarnessKind.CODEX, AgentHarnessKind.CODEX]
            })
        ).toThrow();
    });

    it("refuses an empty roster, which would leave nothing to dispatch to", () => {
        expect(() => LabSettingsSchema.parse({ harness_roster: [] })).toThrow();
    });
});
