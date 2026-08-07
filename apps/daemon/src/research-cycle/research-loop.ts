import { setTimeout as delay } from "node:timers/promises";
import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import { AgentRole } from "@openlab/protocol/agents/agent-role.const";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import { DEFAULT_HARNESS_KINDS } from "@openlab/protocol/investigation-input/investigation-input.const";
import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import type { Lead } from "@openlab/protocol/leads/lead.types";
import { LeadStatus } from "@openlab/protocol/leads/lead-status.const";
import { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import { createHarnesses } from "#src/agent-harness/harness-factory";
import { HarnessBlockKind } from "#src/harness-allowance/harness-block.const";
import type { HarnessBlock } from "#src/harness-allowance/harness-block.types";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { SHIPPED_LAB_SETTINGS } from "#src/lab-settings/lab-settings-store";
import { type DirectorPlan, DirectorPlanSchema } from "#src/research-contract/research-contract";
import { DispatchBlockedError, runAgentWithFallback } from "#src/research-cycle/agent-dispatch";
import { RunDirectoryWorkspaceFactory } from "#src/research-cycle/agent-workspace";
import type { AgentWorkspaceFactory } from "#src/research-cycle/agent-workspace.types";
import { preflightHarnesses } from "#src/research-cycle/harness-roster";
import { researchLead } from "#src/research-cycle/lead-research";
import { throwIfAborted } from "#src/research-cycle/research-cancellation";
import { recordLeads } from "#src/research-cycle/research-journal";
import {
    DEFAULT_CYCLE_BACKOFF_MS,
    HibernationReason,
    PromiseSettlement,
    RESUME_MARGIN_MS,
    ResearchLoopOutcomeStatus
} from "#src/research-cycle/research-loop.const";
import type {
    CreateAgentWorkspace,
    LeadResearchResult,
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

    const settings = options.settings ?? SHIPPED_LAB_SETTINGS;
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
            return await hibernateOnBlockedDispatch(workspace, []);
        }

        const task = workspace.input;
        let cycle = workspace.recovered ? 1 : 0;
        while (workspace.getSnapshot().investigation.state === InvestigationState.RUNNING) {
            throwIfAborted(signal);
            const cycleResult = await runResearchCycle({
                workspace,
                activity,
                task,
                available,
                ...(options.allowances === undefined ? {} : { allowances: options.allowances }),
                settings,
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

        if (error instanceof DispatchBlockedError) {
            return await hibernateOnBlockedDispatch(workspace, error.blocks);
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

/** The director had no leads left to open, which is the only research reason to stop. */
class DirectorExhaustedError extends Error {
    constructor(options?: ErrorOptions) {
        super(HibernationReason.NO_DIRECTION, options);
        this.name = "DirectorExhaustedError";
    }
}

/**
 * Puts the investigation down on whatever stopped it, and says when it comes back. The difference
 * between the answers is the whole of what an operator has to act on: a vendor that stopped serving
 * is a capability only they can restore, while a cap they set themselves needs nothing from them and
 * is only waited out — so nobody is asked for anything an investigation held by its own caps.
 *
 * Either way the wait has a stated end wherever the vendors named one, and the investigation takes
 * itself back up then rather than sitting parked until somebody notices.
 */
async function hibernateOnBlockedDispatch(
    workspace: InvestigationWorkspace,
    blocks: readonly HarnessBlock[]
): Promise<ResearchLoopOutcome> {
    await workspace.update((draft) => {
        for (const run of draft.runs) {
            if (run.status === AgentRunStatus.RUNNING) {
                run.status = AgentRunStatus.BLOCKED;
                run.finished_at = new Date().toISOString();
            }
        }
    });
    const reason = blockedDispatchReason(blocks);
    if (!heldBySpendCaps(blocks) && workspace.getSnapshot().capability_requests.length === 0) {
        await workspace.requestCapability({
            need: "A responsive agent CLI harness this investigation can dispatch to",
            reason,
            provisioningHint:
                "Sign a harness back in on the setup page, or give the lab a credential it can spend, then retry",
            blocking: true
        });
    }
    const resumeAt = dispatchResumesAt(blocks);
    await workspace.hibernate(reason, resumeAt);
    return { status: ResearchLoopOutcomeStatus.HIBERNATING, reason };
}

/** Nothing but the operator's own caps stopped the work, so there is nothing to ask them for. */
function heldBySpendCaps(blocks: readonly HarnessBlock[]): boolean {
    return blocks.length > 0 && blocks.every(({ kind }) => kind === HarnessBlockKind.WITHHELD);
}

/**
 * What every harness answered, under the one sentence that says what it amounts to. A preflight
 * that found nothing carries no answers at all, which is the older and blunter way to be stopped.
 */
function blockedDispatchReason(blocks: readonly HarnessBlock[]): string {
    if (blocks.length === 0) {
        return HibernationReason.NO_HARNESS;
    }
    const headline = heldBySpendCaps(blocks)
        ? HibernationReason.SPEND_CAP
        : HibernationReason.NO_HARNESS;
    const answers = blocks.map(({ harness, reason }) => `${harness} — ${reason}`).join("; ");
    return `${headline}: ${answers}`;
}

/**
 * When the first of the blocked allowances is worth asking again. One of them coming back is
 * enough to research on, so the earliest wins, and the margin keeps the investigation from waking
 * onto a reading taken before the reset it is waiting for.
 */
function dispatchResumesAt(blocks: readonly HarnessBlock[]): string | undefined {
    const returns = blocks
        .flatMap(({ returnsAt }) => (returnsAt === undefined ? [] : [Date.parse(returnsAt)]))
        .filter((instant) => !Number.isNaN(instant));
    if (returns.length === 0) {
        return undefined;
    }
    return new Date(Math.max(Math.min(...returns), Date.now()) + RESUME_MARGIN_MS).toISOString();
}

async function runResearchCycle(input: ResearchCycleInput): Promise<ResearchCycleResult> {
    const {
        workspace,
        activity,
        task,
        available,
        allowances,
        settings,
        createAgentWorkspace,
        cycle,
        signal
    } = input;
    const spent = workspace
        .getSnapshot()
        .leads.filter(({ status }) => status === LeadStatus.EXHAUSTED);

    const plan = await directorPlan(input, spent);
    const leads = await recordLeads(workspace, cycle, plan.leads);

    const settled = await Promise.allSettled(
        leads.map((lead, index) =>
            researchLead({
                workspace,
                activity,
                task,
                lead,
                available,
                ...(allowances === undefined ? {} : { allowances }),
                settings,
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
    const results = settled.map((result): LeadResearchResult => {
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
    spent: readonly Lead[]
): Promise<DirectorPlan> {
    try {
        const run = await runAgentWithFallback({
            workspace: input.workspace,
            activity: input.activity,
            available: input.available,
            ...(input.allowances === undefined ? {} : { allowances: input.allowances }),
            settings: input.settings,
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
        if (error instanceof DispatchBlockedError || input.signal?.aborted === true) {
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
