import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { InvestigationInputSchema } from "@openlab/protocol/investigation-input/investigation-input.schema";
import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import { describe, expect, it, vi } from "vitest";
import { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import { ResearchLoopController } from "#src/daemon-runtime/research-loop-controller";
import { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { ResearchLoopOutcomeStatus } from "#src/research-cycle/research-loop.const";

const PAST = new Date(Date.now() - 1_000).toISOString();

async function createWorkspace(): Promise<InvestigationWorkspace> {
    const directory = await mkdtemp(path.join(tmpdir(), "lab-controller-test-"));
    return InvestigationWorkspace.create(
        directory,
        InvestigationInputSchema.parse({ goal: "Wait out the spend cap" })
    );
}

/** A loop that only records that it was asked to run, and settles without doing any research. */
function countingLoop(started: string[]) {
    return async (workspace: InvestigationWorkspace) => {
        started.push(workspace.investigationId);
        return { status: ResearchLoopOutcomeStatus.CANCELLED };
    };
}

describe("ResearchLoopController", () => {
    it("takes the investigation back up once the allowances it slept on are due", async () => {
        const workspace = await createWorkspace();
        const started: string[] = [];
        const controller = new ResearchLoopController(
            workspace,
            new AgentActivityHub(),
            countingLoop(started)
        );

        await workspace.hibernate("Every subscription is at its cap", PAST);

        await vi.waitFor(() =>
            expect(workspace.getSnapshot().investigation.state).toBe(InvestigationState.RUNNING)
        );
        expect(started).toEqual([workspace.investigationId]);
        await controller.close(new Error("test over"));
    });

    it("owes the wake-up to an investigation the daemon left sleeping", async () => {
        const workspace = await createWorkspace();
        const started: string[] = [];
        await workspace.hibernate("Every subscription is at its cap", PAST);

        const controller = new ResearchLoopController(
            workspace,
            new AgentActivityHub(),
            countingLoop(started)
        );

        await vi.waitFor(() => expect(started).toEqual([workspace.investigationId]));
        await controller.close(new Error("test over"));
    });

    it("leaves a sleep with no stated end for the operator to end", async () => {
        const workspace = await createWorkspace();
        const started: string[] = [];
        const controller = new ResearchLoopController(
            workspace,
            new AgentActivityHub(),
            countingLoop(started)
        );

        await workspace.hibernate("The director has nowhere else to look");
        await new Promise((settle) => setTimeout(settle, 20));

        expect(workspace.getSnapshot().investigation.state).toBe(InvestigationState.HIBERNATING);
        expect(started).toEqual([]);
        await controller.close(new Error("test over"));
    });
});
