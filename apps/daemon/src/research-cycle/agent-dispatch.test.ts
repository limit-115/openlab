import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { type HarnessKind, HarnessKinds } from "@lab/harness/agent-harness.const";
import type { AgentHarness, HarnessPreflight } from "@lab/harness/agent-harness.types";
import type { SubscriptionAllowance as HarnessAllowance } from "@lab/harness/subscription-allowance.types";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { InvestigationInputSchema } from "@lab/protocol/investigation-input/investigation-input.schema";
import { describe, expect, it } from "vitest";
import { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { DirectorPlanSchema } from "#src/research-contract/research-contract";
import {
    HarnessCapabilityBlockedError,
    runAgentWithFallback
} from "#src/research-cycle/agent-dispatch";
import type { AvailableHarness } from "#src/research-cycle/research-loop.types";
import { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

/** A harness the gate must never reach: every way of using it fails the test out loud. */
function unusedHarness(kind: HarnessKind): AvailableHarness {
    const harness: AgentHarness = {
        kind,
        resolveSession: () => {
            throw new Error(`${kind} was asked to resolve a session`);
        },
        preflight: () => {
            throw new Error(`${kind} was preflighted`);
        },
        run: () => {
            throw new Error(`${kind} was dispatched a run`);
        }
    };
    return { harness, preflight: {} as HarnessPreflight };
}

function readings(spent: readonly HarnessKind[]): SubscriptionAllowanceReadings {
    return new SubscriptionAllowanceReadings({
        read: async (kind): Promise<HarnessAllowance> => ({
            kind,
            plan: "max",
            windows: [
                {
                    durationMinutes: 10_080,
                    usedPercent: spent.includes(kind) ? 100 : 12,
                    resetsAt: "2026-08-09T13:50:53.000Z"
                }
            ]
        })
    });
}

async function testWorkspace(name: string): Promise<InvestigationWorkspace> {
    const directory = await mkdtemp(path.join(tmpdir(), `lab-${name}-`));
    return InvestigationWorkspace.create(
        directory,
        InvestigationInputSchema.parse({ goal: "Spend the allowance wisely" })
    );
}

describe("runAgentWithFallback", () => {
    it("asks the operator instead of dispatching when no subscription has allowance left", async () => {
        const workspace = await testWorkspace("dispatch-spent");
        let workspacesCreated = 0;

        const dispatch = runAgentWithFallback({
            workspace,
            activity: new AgentActivityHub(),
            available: [unusedHarness(HarnessKinds.CODEX), unusedHarness(HarnessKinds.CLAUDE)],
            subscriptions: readings([HarnessKinds.CODEX, HarnessKinds.CLAUDE]),
            preferredIndex: 0,
            role: AgentRole.DIRECTOR,
            objective: "Find where this goal might be reachable",
            createAgentWorkspace: async () => {
                workspacesCreated += 1;
                throw new Error("a run was prepared for a spent subscription");
            },
            prompt: "Plan the cycle",
            schema: DirectorPlanSchema
        });

        await expect(dispatch).rejects.toBeInstanceOf(HarnessCapabilityBlockedError);
        expect(workspacesCreated).toBe(0);
        expect(
            workspace
                .getSnapshot()
                .capability_requests.filter(({ status }) => status === CapabilityStatus.OPEN)
        ).not.toHaveLength(0);
    });

    it("moves on to the subscription that still has allowance", async () => {
        const workspace = await testWorkspace("dispatch-fallthrough");
        const dispatched: string[] = [];
        const reached = new Error("reached dispatch");

        const dispatch = runAgentWithFallback({
            workspace,
            activity: new AgentActivityHub(),
            available: [unusedHarness(HarnessKinds.CODEX), unusedHarness(HarnessKinds.CLAUDE)],
            subscriptions: readings([HarnessKinds.CODEX]),
            preferredIndex: 0,
            role: AgentRole.DIRECTOR,
            objective: "Find where this goal might be reachable",
            createAgentWorkspace: async () => {
                dispatched.push(AgentRole.DIRECTOR);
                throw reached;
            },
            prompt: "Plan the cycle",
            schema: DirectorPlanSchema
        });

        await expect(dispatch).rejects.toBe(reached);
        expect(dispatched).toHaveLength(1);
    });

    it("dispatches blind when no readings were wired in", async () => {
        const workspace = await testWorkspace("dispatch-blind");
        const reached = new Error("reached dispatch");

        const dispatch = runAgentWithFallback({
            workspace,
            activity: new AgentActivityHub(),
            available: [unusedHarness(HarnessKinds.CODEX)],
            preferredIndex: 0,
            role: AgentRole.DIRECTOR,
            objective: "Find where this goal might be reachable",
            createAgentWorkspace: async () => {
                throw reached;
            },
            prompt: "Plan the cycle",
            schema: DirectorPlanSchema
        });

        await expect(dispatch).rejects.toBe(reached);
    });
});
