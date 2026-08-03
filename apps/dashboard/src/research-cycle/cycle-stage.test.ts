import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import type { AgentSummary } from "@lab/protocol/agents/agent-summary.types";
import { describe, expect, it } from "vitest";
import { cycleStages } from "#src/research-cycle/cycle-stage";
import { CycleStageState } from "#src/research-cycle/cycle-stage.const";

function agent(role: AgentRole, status: AgentStatus, id: string): AgentSummary {
    return { id, branch_id: `${id}-branch`, role, status };
}

function stageFor(stages: ReturnType<typeof cycleStages>, role: AgentRole) {
    const stage = stages.find((candidate) => candidate.role === role);
    if (stage === undefined) {
        throw new Error(`The rail is missing the ${role} stage`);
    }
    return stage;
}

describe("cycleStages", () => {
    it("reports a stage as blocked even while another agent on it keeps working", () => {
        const stages = cycleStages([
            agent(AgentRole.RESEARCHER, AgentStatus.WORKING, "r-1"),
            agent(AgentRole.RESEARCHER, AgentStatus.BLOCKED, "r-2")
        ]);

        expect(stageFor(stages, AgentRole.RESEARCHER).state).toBe(CycleStageState.BLOCKED);
    });

    it("separates a stage that has finished from one nobody has reached", () => {
        const stages = cycleStages([agent(AgentRole.DIRECTOR, AgentStatus.STOPPED, "d-1")]);

        expect(stageFor(stages, AgentRole.DIRECTOR).state).toBe(CycleStageState.DONE);
        expect(stageFor(stages, AgentRole.VERIFIER).state).toBe(CycleStageState.PENDING);
    });

    it("counts every status on a stage instead of naming only the loudest", () => {
        const stages = cycleStages([
            agent(AgentRole.RESEARCHER, AgentStatus.WORKING, "r-1"),
            agent(AgentRole.RESEARCHER, AgentStatus.WORKING, "r-2"),
            agent(AgentRole.RESEARCHER, AgentStatus.IDLE, "r-3"),
            agent(AgentRole.RESEARCHER, AgentStatus.STOPPED, "r-4")
        ]);

        expect(stageFor(stages, AgentRole.RESEARCHER).note).toBe(
            "2 working · 1 waiting · 1 finished"
        );
    });

    it("keeps the roles in the order a cycle runs them", () => {
        const stages = cycleStages([]);

        expect(stages.map(({ role }) => role)).toEqual([
            AgentRole.DIRECTOR,
            AgentRole.RESEARCHER,
            AgentRole.CRITIC,
            AgentRole.VERIFIER
        ]);
    });
});
