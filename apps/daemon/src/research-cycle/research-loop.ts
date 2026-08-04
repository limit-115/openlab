import { setTimeout as delay } from "node:timers/promises";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import type { Assumption } from "@lab/protocol/assumptions/assumption.types";
import { AssumptionStatus } from "@lab/protocol/assumptions/assumption-status.const";
import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { type DirectorPlan, DirectorPlanSchema } from "#src/research-contract/research-contract";
import {
    HarnessCapabilityBlockedError,
    runAgentWithFallback
} from "#src/research-cycle/agent-dispatch";
import { RunDirectoryWorkspaceFactory } from "#src/research-cycle/agent-workspace";
import type { AgentWorkspaceFactory } from "#src/research-cycle/agent-workspace.types";
import { researchAssumption } from "#src/research-cycle/assumption-research";
import { createHarnesses, preflightHarnesses } from "#src/research-cycle/harness-roster";
import { DEFAULT_HARNESS_KINDS } from "#src/research-cycle/harness-roster.const";
import { throwIfAborted } from "#src/research-cycle/research-cancellation";
import { recordAssumptions } from "#src/research-cycle/research-journal";
import {
    DEFAULT_CYCLE_BACKOFF_MS,
    HibernationReason,
    PromiseSettlement,
    ResearchLoopOutcomeStatus
} from "#src/research-cycle/research-loop.const";
import type {
    AssumptionResearchResult,
    CreateAgentWorkspace,
    ResearchCycleInput,
    ResearchCycleResult,
    ResearchLoopOptions,
    ResearchLoopOutcome
} from "#src/research-cycle/research-loop.types";
import { cancelActiveWork } from "#src/research-cycle/research-work-recovery";
import { directorPrompt } from "#src/research-prompts/research-prompts";

export async function runResearchLoop(
    workspace: InvestigationWorkspace,
    options: ResearchLoopOptions = {}
): Promise<ResearchLoopOutcome> {
    const signal = options.signal;
    const activity = options.activity ?? new AgentActivityHub();
    if (signal?.aborted) {
        return { status: ResearchLoopOutcomeStatus.CANCELLED };
    }

    const harnesses = options.harnesses ?? createHarnesses(DEFAULT_HARNESS_KINDS);
    const workspaceFactory =
        options.workspaceFactory ?? new RunDirectoryWorkspaceFactory(workspace.runDirectory);
    const createAgentWorkspace = workspaceAllocator(workspaceFactory);
    const cycleBackoffMs = options.cycleBackoffMs ?? DEFAULT_CYCLE_BACKOFF_MS;
    const waitForCycle = options.waitForCycle ?? defaultCycleWait;

    try {
        const available = await preflightHarnesses(workspace, harnesses, signal);
        throwIfAborted(signal);
        if (available.length === 0) {
            await blockOnUnavailableHarnesses(workspace);
            return {
                status: ResearchLoopOutcomeStatus.HIBERNATING,
                reason: HibernationReason.NO_HARNESS
            };
        }

        const task = await workspace.getTask();
        let cycle = workspace.recovered ? 1 : 0;
        while (workspace.getSnapshot().investigation.state === InvestigationState.RUNNING) {
            throwIfAborted(signal);
            const cycleResult = await runResearchCycle({
                workspace,
                activity,
                task,
                available,
                ...(options.subscriptions === undefined
                    ? {}
                    : { subscriptions: options.subscriptions }),
                createAgentWorkspace,
                cycle,
                ...(signal === undefined ? {} : { signal })
            });
            if (cycleResult.breakthrough !== undefined) {
                await workspace.recordBreakthrough(cycleResult.breakthrough);
                return { status: ResearchLoopOutcomeStatus.BREAKTHROUGH };
            }
            cycle += 1;
            await waitForCycle(cycleBackoffMs, signal);
        }

        return { status: ResearchLoopOutcomeStatus.CANCELLED };
    } catch (error) {
        if (signal?.aborted) {
            await cancelActiveWork(workspace);
            return { status: ResearchLoopOutcomeStatus.CANCELLED };
        }

        if (error instanceof HarnessCapabilityBlockedError) {
            await blockOnUnavailableHarnesses(workspace);
            return {
                status: ResearchLoopOutcomeStatus.HIBERNATING,
                reason: HibernationReason.NO_HARNESS
            };
        }

        if (error instanceof DirectorExhaustedError) {
            await workspace.hibernate(HibernationReason.NO_DIRECTION);
            return {
                status: ResearchLoopOutcomeStatus.HIBERNATING,
                reason: HibernationReason.NO_DIRECTION
            };
        }

        const reason = error instanceof Error ? error.message : String(error);
        if (workspace.getSnapshot().investigation.state === InvestigationState.RUNNING) {
            await workspace.transition(InvestigationState.FAILED, reason, {
                failureReason: reason
            });
            await workspace.appendEvent(EventType.INVESTIGATION_FAILED, { reason });
        }
        return { status: ResearchLoopOutcomeStatus.FAILED, reason };
    }
}

/** The director had nothing left to bet on, which is the only research reason to stop. */
class DirectorExhaustedError extends Error {
    constructor(options?: ErrorOptions) {
        super(HibernationReason.NO_DIRECTION, options);
        this.name = "DirectorExhaustedError";
    }
}

async function blockOnUnavailableHarnesses(workspace: InvestigationWorkspace): Promise<void> {
    await workspace.update((draft) => {
        for (const run of draft.runs) {
            if (run.status === AgentRunStatus.RUNNING) {
                run.status = AgentRunStatus.BLOCKED;
                run.finished_at = new Date().toISOString();
            }
        }
    });
    if (workspace.getSnapshot().capability_requests.length === 0) {
        await workspace.requestCapability({
            need: "A responsive Codex, Claude or GLM CLI with an active product subscription",
            reason: HibernationReason.NO_HARNESS,
            provisioningHint:
                "Restore a local product-subscription CLI session and retry; API billing is forbidden",
            blocking: true
        });
    }
    await workspace.hibernate(HibernationReason.NO_HARNESS);
}

async function runResearchCycle(input: ResearchCycleInput): Promise<ResearchCycleResult> {
    const {
        workspace,
        activity,
        task,
        available,
        subscriptions,
        createAgentWorkspace,
        cycle,
        signal
    } = input;
    const spent = workspace
        .getSnapshot()
        .assumptions.filter(({ status }) => status === AssumptionStatus.EXHAUSTED);

    const plan = await directorPlan(input, spent);
    const assumptions = await recordAssumptions(workspace, cycle, plan.assumptions);

    const settled = await Promise.allSettled(
        assumptions.map((assumption, index) =>
            researchAssumption({
                workspace,
                activity,
                task,
                assumption,
                available,
                ...(subscriptions === undefined ? {} : { subscriptions }),
                preferredHarnessIndex: cycle + index + 1,
                createAgentWorkspace,
                ...(signal === undefined ? {} : { signal })
            })
        )
    );
    const rejected = settled.find(
        (result): result is PromiseRejectedResult => result.status === PromiseSettlement.REJECTED
    );
    if (signal?.aborted && rejected !== undefined) {
        throw rejected.reason;
    }
    const results = settled.map((result): AssumptionResearchResult => {
        if (result.status === PromiseSettlement.FULFILLED) {
            return result.value;
        }
        return {
            issues: [result.reason instanceof Error ? result.reason.message : String(result.reason)]
        };
    });

    const breakthrough = results.find(({ confirmed }) => confirmed !== undefined)?.confirmed;
    return {
        ...(breakthrough === undefined ? {} : { breakthrough }),
        issues: results.flatMap(({ issues }) => issues)
    };
}

async function directorPlan(
    input: ResearchCycleInput,
    spent: readonly Assumption[]
): Promise<DirectorPlan> {
    try {
        const run = await runAgentWithFallback({
            workspace: input.workspace,
            activity: input.activity,
            available: input.available,
            ...(input.subscriptions === undefined ? {} : { subscriptions: input.subscriptions }),
            preferredIndex: input.cycle,
            role: AgentRole.DIRECTOR,
            objective: "Find where this goal might be reachable",
            createAgentWorkspace: input.createAgentWorkspace,
            prompt: directorPrompt(input.task, spent),
            schema: DirectorPlanSchema,
            ...(input.signal === undefined ? {} : { signal: input.signal })
        });
        return run.value;
    } catch (error) {
        if (error instanceof HarnessCapabilityBlockedError || input.signal?.aborted === true) {
            throw error;
        }
        throw new DirectorExhaustedError({ cause: error });
    }
}

function workspaceAllocator(factory: AgentWorkspaceFactory): CreateAgentWorkspace {
    const nextOrdinal: Record<AgentRole, number> = {
        [AgentRole.DIRECTOR]: 0,
        [AgentRole.RESEARCHER]: 0,
        [AgentRole.VERIFIER]: 0
    };
    return async (role) => {
        const ordinal = nextOrdinal[role];
        nextOrdinal[role] += 1;
        return factory.create(role, ordinal);
    };
}

async function defaultCycleWait(milliseconds: number, signal?: AbortSignal): Promise<void> {
    await delay(milliseconds, undefined, signal === undefined ? {} : { signal });
}
