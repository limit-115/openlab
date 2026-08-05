import type { AgentRun } from "@openlab/protocol/agent-runs/agent-run.types";
import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import { AgentRole } from "@openlab/protocol/agents/agent-role.const";
import { describe, expect, it } from "vitest";
import { cycleStages } from "#src/research-cycle/cycle-stage";
import { CycleStageState } from "#src/research-cycle/cycle-stage.const";

function run(role: AgentRole, status: AgentRunStatus, id: string): AgentRun {
    return {
        id,
        role,
        objective: `Work as ${role}`,
        status,
        cwd: `/tmp/${id}`,
        started_at: "2026-08-03T10:00:00.000Z"
    };
}

function stageFor(stages: ReturnType<typeof cycleStages>, role: AgentRole) {
    const stage = stages.find((candidate) => candidate.role === role);
    if (stage === undefined) {
        throw new Error(`The rail is missing the ${role} stage`);
    }
    return stage;
}

describe("cycleStages", () => {
    it("reports a stage as blocked even while another run on it keeps working", () => {
        const stages = cycleStages([
            run(AgentRole.RESEARCHER, AgentRunStatus.RUNNING, "r-1"),
            run(AgentRole.RESEARCHER, AgentRunStatus.BLOCKED, "r-2")
        ]);

        expect(stageFor(stages, AgentRole.RESEARCHER).state).toBe(CycleStageState.BLOCKED);
    });

    it("separates a stage that has finished from one nobody has reached", () => {
        const stages = cycleStages([run(AgentRole.DIRECTOR, AgentRunStatus.SUCCEEDED, "d-1")]);

        expect(stageFor(stages, AgentRole.DIRECTOR).state).toBe(CycleStageState.DONE);
        expect(stageFor(stages, AgentRole.VERIFIER).state).toBe(CycleStageState.PENDING);
    });

    it("counts every status on a stage instead of naming only the loudest", () => {
        const stages = cycleStages([
            run(AgentRole.RESEARCHER, AgentRunStatus.RUNNING, "r-1"),
            run(AgentRole.RESEARCHER, AgentRunStatus.RUNNING, "r-2"),
            run(AgentRole.RESEARCHER, AgentRunStatus.SUCCEEDED, "r-3"),
            run(AgentRole.RESEARCHER, AgentRunStatus.FAILED, "r-4")
        ]);

        expect(stageFor(stages, AgentRole.RESEARCHER).counts).toEqual({
            running: 2,
            blocked: 0,
            succeeded: 1,
            ended: 1
        });
    });

    it("keeps the roles in the order a cycle runs them", () => {
        const stages = cycleStages([]);

        expect(stages.map(({ role }) => role)).toEqual([
            AgentRole.DIRECTOR,
            AgentRole.RESEARCHER,
            AgentRole.VERIFIER
        ]);
    });
});
