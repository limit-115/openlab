import {
    AgentActivityPhase,
    AgentRunStatus
} from "@lab/protocol/agent-activity/agent-activity.const";
import {
    AgentActivityFrameKind,
    AgentToolPhase
} from "@lab/protocol/agent-activity/agent-activity-frame.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { TranscriptEntry, WatchedAgent } from "#src/team/agent-transcript.types";
import { watchedActivity } from "#src/team/team.fixture";
import { TeamPanel } from "#src/team/team-panel";

const REASONING =
    "The evaluator divides by the sample count, so an empty sample raises before it can report.";

const COMMAND = "pnpm vitest run evaluators/body_harness_validity.py --reporter verbose";

const TASK: InternalTask = {
    id: "task-researcher-0-1",
    branch_id: "branch-researcher-0-1",
    objective: "Measure indexed lookup against the baseline",
    context_refs: [],
    status: InternalTaskStatus.RUNNING,
    attempt: 1,
    role: AgentRole.RESEARCHER
};

function agent(transcript: TranscriptEntry[], activity = watchedActivity()): WatchedAgent {
    return { activity, transcript };
}

describe("TeamPanel", () => {
    it("keeps reasoning folded away until the operator asks for it", async () => {
        render(
            <TeamPanel
                agents={[
                    agent([
                        {
                            id: "run-9f0c:2",
                            kind: AgentActivityFrameKind.THINKING,
                            turn: 0,
                            text: REASONING,
                            sealed: true
                        }
                    ])
                ]}
                tasks={[TASK]}
            />
        );

        const thread = screen.getByRole("article");

        expect(screen.queryByText(REASONING)).toBeNull();
        await userEvent.click(within(thread).getByRole("button", { name: /Thinking/ }));

        expect(screen.getByText(REASONING)).toBeVisible();
    });

    it("shows the whole command a tool call ran, not a shortened one", () => {
        render(
            <TeamPanel
                agents={[
                    agent([
                        {
                            id: "run-9f0c:3",
                            kind: AgentActivityFrameKind.TOOL,
                            toolName: "Bash",
                            callId: "toolu_01",
                            phase: AgentToolPhase.COMPLETED,
                            detail: COMMAND
                        }
                    ])
                ]}
                tasks={[TASK]}
            />
        );

        expect(screen.getByText("Bash").parentElement?.textContent).toContain(COMMAND);
    });

    it("names the harness, model and effort behind the agent, beside its task", () => {
        render(<TeamPanel agents={[agent([])]} tasks={[TASK]} />);

        const card = screen.getByRole("heading", { name: "researcher" }).closest("article");

        expect(card?.textContent).toContain("Claude · claude-opus-5 · high effort");
        expect(card?.textContent).toContain(TASK.objective);
    });

    it("reports a run that failed, with the reason it gave", () => {
        render(
            <TeamPanel
                agents={[
                    agent(
                        [],
                        watchedActivity({
                            phase: AgentActivityPhase.FINISHED,
                            status: AgentRunStatus.FAILED,
                            error: "claude harness run timed out"
                        })
                    )
                ]}
                tasks={[TASK]}
            />
        );

        const card = screen.getByRole("heading", { name: "researcher" }).closest("article");

        expect(card?.textContent).toContain("claude harness run timed out");
        expect(card?.textContent).toContain("Failed");
    });

    it("says both what the agent is doing and how its run is going", () => {
        render(
            <TeamPanel
                agents={[
                    agent(
                        [],
                        watchedActivity({
                            phase: AgentActivityPhase.USING_TOOL,
                            status: AgentRunStatus.RUNNING
                        })
                    )
                ]}
                tasks={[TASK]}
            />
        );

        const card = screen.getByRole("heading", { name: "researcher" }).closest("article");

        expect(card?.textContent).toContain("Using a tool");
        expect(card?.textContent).toContain("Running");
    });

    it("reads a second agent without losing sight of the first", async () => {
        const critic = watchedActivity({
            agent_id: "agent-critic-0-1",
            task_id: "task-critic-0-1",
            role: AgentRole.CRITIC
        });
        render(
            <TeamPanel
                agents={[
                    agent([
                        {
                            id: "run-9f0c:2",
                            kind: AgentActivityFrameKind.THINKING,
                            turn: 0,
                            text: REASONING,
                            sealed: true
                        }
                    ]),
                    agent(
                        [
                            {
                                id: "run-critic:1",
                                kind: AgentActivityFrameKind.TOOL,
                                toolName: "Bash",
                                callId: "toolu_02",
                                phase: AgentToolPhase.COMPLETED,
                                detail: COMMAND
                            }
                        ],
                        critic
                    )
                ]}
                tasks={[TASK]}
            />
        );

        const roster = screen.getByRole("list", { name: "Agents" });
        expect(within(screen.getByRole("article")).queryByText(COMMAND)).toBeNull();

        await userEvent.click(within(roster).getByRole("button", { name: /critic/i }));

        expect(within(screen.getByRole("article")).getByText(COMMAND)).toBeVisible();
        expect(within(roster).getByRole("button", { name: /researcher/i })).toBeVisible();
    });

    it("says so plainly when the lab is running nobody", () => {
        render(<TeamPanel agents={[]} tasks={[]} />);

        expect(screen.queryByRole("article")).toBeNull();
        expect(screen.getByText(/No agent is running/)).toBeVisible();
    });
});
