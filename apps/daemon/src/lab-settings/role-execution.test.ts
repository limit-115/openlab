import { AgentEffortLevel, AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { AgentRole } from "@openlab/protocol/agents/agent-role.const";
import { LabSettingsSchema } from "@openlab/protocol/lab-settings/lab-settings.schema";
import { describe, expect, it } from "vitest";
import { resolveRoleExecution } from "#src/lab-settings/role-execution";

const CONFIGURED = LabSettingsSchema.parse({
    role_execution: [
        {
            role: AgentRole.DIRECTOR,
            effort: AgentEffortLevel.MAX,
            models: [
                { harness: AgentHarnessKind.CLAUDE, model: "opus" },
                { harness: AgentHarnessKind.CODEX, model: "gpt-5.6-sol" }
            ]
        },
        { role: AgentRole.VERIFIER, effort: AgentEffortLevel.HIGH, models: [] }
    ]
});

describe("resolveRoleExecution", () => {
    it("runs a role on the model set for the harness it landed on", () => {
        expect(
            resolveRoleExecution(CONFIGURED, AgentRole.DIRECTOR, AgentHarnessKind.CLAUDE)
        ).toEqual({ effort: AgentEffortLevel.MAX, model: "opus" });
        expect(
            resolveRoleExecution(CONFIGURED, AgentRole.DIRECTOR, AgentHarnessKind.CODEX)
        ).toEqual({ effort: AgentEffortLevel.MAX, model: "gpt-5.6-sol" });
    });

    it("leaves the model to the harness where the role names none for that vendor", () => {
        expect(resolveRoleExecution(CONFIGURED, AgentRole.DIRECTOR, AgentHarnessKind.GLM)).toEqual({
            effort: AgentEffortLevel.MAX
        });
        expect(
            resolveRoleExecution(CONFIGURED, AgentRole.VERIFIER, AgentHarnessKind.CLAUDE)
        ).toEqual({ effort: AgentEffortLevel.HIGH });
    });

    it("holds a role nobody configured at the effort every harness already defaults to", () => {
        expect(
            resolveRoleExecution(CONFIGURED, AgentRole.RESEARCHER, AgentHarnessKind.CLAUDE)
        ).toEqual({ effort: AgentEffortLevel.MEDIUM });
    });

    it("keeps one role's model off another role on the same harness", () => {
        expect(
            resolveRoleExecution(CONFIGURED, AgentRole.RESEARCHER, AgentHarnessKind.CODEX).model
        ).toBeUndefined();
    });
});
