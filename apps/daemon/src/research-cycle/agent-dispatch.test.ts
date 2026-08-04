import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    HarnessEffortLevels,
    type HarnessKind,
    HarnessKinds
} from "@lab/harness/agent-harness.const";
import type {
    AgentHarness,
    HarnessPreflight,
    HarnessRunRequest
} from "@lab/harness/agent-harness.types";
import { HarnessEventTypes } from "@lab/harness/harness-event.const";
import type { SubscriptionAllowance as HarnessAllowance } from "@lab/harness/subscription-allowance.types";
import { AgentEffortLevel, AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { InvestigationInputSchema } from "@lab/protocol/investigation-input/investigation-input.schema";
import { LabSettingsSchema } from "@lab/protocol/lab-settings/lab-settings.schema";
import { describe, expect, it } from "vitest";
import { harnessEvents, harnessRunResult } from "#src/agent-activity/agent-activity.fixture";
import { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { SHIPPED_LAB_SETTINGS } from "#src/lab-settings/lab-settings-store";
import { DirectorPlanSchema } from "#src/research-contract/research-contract";
import {
    HarnessCapabilityBlockedError,
    runAgentWithFallback
} from "#src/research-cycle/agent-dispatch";
import type { AgentWorkspace } from "#src/research-cycle/agent-workspace.types";
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

const DIRECTOR_PLAN = {
    reconnaissance: "Read the reference implementation end to end",
    assumptions: [{ statement: "The hot loop dominates", rationale: "It runs per byte" }],
    capability_requests: []
} as const;

/**
 * A harness that answers, and keeps every request it was handed. The session it resolves mirrors
 * the request, so a run that named no model is visibly a run the harness was left to decide.
 */
function answeringHarness(kind: HarnessKind, requests: HarnessRunRequest[]): AvailableHarness {
    const harness: AgentHarness = {
        kind,
        resolveSession: (request) => ({
            model: request.model ?? `${kind}-default`,
            effort: request.effort ?? HarnessEffortLevels.MEDIUM
        }),
        preflight: async () => ({}) as HarnessPreflight,
        run: async function* (request) {
            requests.push(request);
            yield* harnessEvents([
                {
                    type: HarnessEventTypes.RUN_COMPLETED,
                    result: harnessRunResult({ kind, structuredOutput: DIRECTOR_PLAN })
                }
            ]);
        }
    };
    return { harness, preflight: {} as HarnessPreflight };
}

async function agentWorkspace(role: AgentRole): Promise<AgentWorkspace> {
    const cwd = await mkdtemp(path.join(tmpdir(), `lab-agent-${role}-`));
    return { id: `${role}-000`, role, cwd, artifactDirectory: path.join(cwd, ".lab-artifacts") };
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
            settings: SHIPPED_LAB_SETTINGS,
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
            settings: SHIPPED_LAB_SETTINGS,
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
            settings: SHIPPED_LAB_SETTINGS,
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

    it("runs the role on the model and effort the lab settings put it on", async () => {
        const workspace = await testWorkspace("dispatch-settings");
        const requests: HarnessRunRequest[] = [];
        const settings = LabSettingsSchema.parse({
            role_execution: [
                {
                    role: AgentRole.DIRECTOR,
                    effort: AgentEffortLevel.MAX,
                    models: [{ harness: AgentHarnessKind.CLAUDE, model: "opus" }]
                }
            ]
        });

        const run = await runAgentWithFallback({
            workspace,
            activity: new AgentActivityHub(),
            available: [answeringHarness(HarnessKinds.CLAUDE, requests)],
            settings: { read: () => settings },
            preferredIndex: 0,
            role: AgentRole.DIRECTOR,
            objective: "Find where this goal might be reachable",
            createAgentWorkspace: agentWorkspace,
            prompt: "Plan the cycle",
            schema: DirectorPlanSchema
        });

        expect(requests).toHaveLength(1);
        expect(requests[0]?.model).toBe("opus");
        expect(requests[0]?.effort).toBe(HarnessEffortLevels.MAX);
        expect(run.value.reconnaissance).toBe(DIRECTOR_PLAN.reconnaissance);
    });

    it("leaves an unconfigured role to the harness, which is the lab as shipped", async () => {
        const workspace = await testWorkspace("dispatch-shipped");
        const requests: HarnessRunRequest[] = [];

        await runAgentWithFallback({
            workspace,
            activity: new AgentActivityHub(),
            available: [answeringHarness(HarnessKinds.CLAUDE, requests)],
            settings: SHIPPED_LAB_SETTINGS,
            preferredIndex: 0,
            role: AgentRole.DIRECTOR,
            objective: "Find where this goal might be reachable",
            createAgentWorkspace: agentWorkspace,
            prompt: "Plan the cycle",
            schema: DirectorPlanSchema
        });

        expect(requests[0]?.model).toBeUndefined();
        expect(requests[0]?.effort).toBe(HarnessEffortLevels.MEDIUM);
    });
});
