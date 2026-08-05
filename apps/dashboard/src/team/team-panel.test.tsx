import { AgentActivityPhase } from "@openlab/protocol/agent-activity/agent-activity.const";
import {
    AgentActivityFrameKind,
    AgentToolPhase
} from "@openlab/protocol/agent-activity/agent-activity-frame.const";
import type { AgentRun } from "@openlab/protocol/agent-runs/agent-run.types";
import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import { AgentRole } from "@openlab/protocol/agents/agent-role.const";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { TranscriptEntry, WatchedAgent } from "#src/team/agent-transcript.types";
import { watchedActivity } from "#src/team/team.fixture";
import { TEAM_EN } from "#src/team/team.i18n";
import { TeamPanel } from "#src/team/team-panel";

const REASONING =
    "The evaluator divides by the sample count, so an empty sample raises before it can report.";

const COMMAND = "pnpm vitest run evaluators/body_harness_validity.py --reporter verbose";

const RUN: AgentRun = {
    id: "run-researcher-9f0c",
    role: AgentRole.RESEARCHER,
    assumption_id: "assumption-landmarks",
    objective: "Measure indexed lookup against the baseline",
    status: AgentRunStatus.RUNNING,
    cwd: "/tmp/lab/researcher-000",
    started_at: "2026-08-03T10:00:00.000Z"
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
                runs={[RUN]}
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
                runs={[RUN]}
            />
        );

        expect(screen.getByText("Bash").parentElement?.textContent).toContain(COMMAND);
    });

    it("names the harness, model and effort behind the agent, beside its task", () => {
        render(<TeamPanel agents={[agent([])]} runs={[RUN]} />);

        const card = screen
            .getByRole("heading", { name: TEAM_EN[AgentRole.RESEARCHER] })
            .closest("article");

        expect(card?.textContent).toContain("Claude · claude-opus-5 · High effort");
        expect(card?.textContent).toContain(RUN.objective);
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
                runs={[RUN]}
            />
        );

        const card = screen
            .getByRole("heading", { name: TEAM_EN[AgentRole.RESEARCHER] })
            .closest("article");

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
                runs={[RUN]}
            />
        );

        const card = screen
            .getByRole("heading", { name: TEAM_EN[AgentRole.RESEARCHER] })
            .closest("article");

        expect(card?.textContent).toContain("Using a tool");
        expect(card?.textContent).toContain("Running");
    });

    it("names the model and the run of every agent in the roster, unopened", () => {
        const verifier = watchedActivity({
            run_id: "run-verifier-0-1",
            role: AgentRole.VERIFIER,
            phase: AgentActivityPhase.FINISHED,
            status: AgentRunStatus.FAILED
        });
        render(<TeamPanel agents={[agent([]), agent([], verifier)]} runs={[RUN]} />);

        const roster = screen.getByRole("list", { name: "Agents" });
        const entry = within(roster).getByRole("button", { name: /verifier/i });

        expect(entry.textContent).toContain("claude-opus-5");
        expect(entry.textContent).toContain("Failed");
        expect(entry.textContent).toContain("Finished");
    });

    it("reads a second agent without losing sight of the first", async () => {
        const verifier = watchedActivity({
            run_id: "run-verifier-0-1",
            role: AgentRole.VERIFIER
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
                        verifier
                    )
                ]}
                runs={[RUN]}
            />
        );

        const roster = screen.getByRole("list", { name: "Agents" });
        expect(within(screen.getByRole("article")).queryByText(COMMAND)).toBeNull();

        await userEvent.click(within(roster).getByRole("button", { name: /verifier/i }));

        expect(within(screen.getByRole("article")).getByText(COMMAND)).toBeVisible();
        expect(within(roster).getByRole("button", { name: /researcher/i })).toBeVisible();
    });

    it("says so plainly when the investigation is running nobody", () => {
        render(<TeamPanel agents={[]} runs={[]} />);

        expect(screen.queryByRole("article")).toBeNull();
        expect(screen.getByText(/No agent is running/)).toBeVisible();
    });
});
