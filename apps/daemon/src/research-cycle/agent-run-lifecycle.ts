import { randomUUID } from "node:crypto";
import { AgentRunStatus } from "@nightlab/protocol/agent-runs/agent-run-status.const";
import type { AgentRole } from "@nightlab/protocol/agents/agent-role.const";
import type { CapabilityRequest } from "@nightlab/protocol/capabilities/capability-request.types";
import { EventType } from "@nightlab/protocol/investigation-events/event-type.const";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { requiredById } from "#src/investigation-workspace/snapshot-entities";
import { RUN_FAILURE_EVENT } from "#src/research-cycle/agent-run-lifecycle.const";
import type {
    AgentRunFailure,
    StartAgentRunInput
} from "#src/research-cycle/agent-run-lifecycle.types";

export function newAgentRunId(role: AgentRole): string {
    return `run-${role}-${randomUUID()}`;
}

export async function startAgentRun(
    workspace: InvestigationWorkspace,
    input: StartAgentRunInput
): Promise<void> {
    await workspace.update((draft) => {
        draft.runs.push({
            id: input.id,
            role: input.role,
            ...(input.assumptionId === undefined ? {} : { assumption_id: input.assumptionId }),
            objective: input.objective,
            status: AgentRunStatus.RUNNING,
            cwd: input.cwd,
            started_at: new Date().toISOString()
        });
    });
    await workspace.appendEvent(EventType.RUN_STARTED, {
        run_id: input.id,
        role: input.role,
        ...(input.assumptionId === undefined ? {} : { assumption_id: input.assumptionId })
    });
}

export async function finishAgentRun(
    workspace: InvestigationWorkspace,
    runId: string,
    outcome: { readonly exitCode?: number | null; readonly manifestPath?: string } = {}
): Promise<void> {
    await workspace.update((draft) => {
        const run = requiredById(draft.runs, runId);
        run.status = AgentRunStatus.SUCCEEDED;
        run.finished_at = new Date().toISOString();
        if (outcome.exitCode !== undefined) {
            run.exit_code = outcome.exitCode;
        }
        if (outcome.manifestPath !== undefined) {
            run.manifest_path = outcome.manifestPath;
        }
    });
    await workspace.appendEvent(EventType.RUN_SUCCEEDED, { run_id: runId });
}

export async function failAgentRun(
    workspace: InvestigationWorkspace,
    runId: string,
    failure: AgentRunFailure
): Promise<void> {
    await workspace.update((draft) => {
        const run = requiredById(draft.runs, runId);
        run.status = failure.status;
        run.error = failure.error;
        run.finished_at = new Date().toISOString();
    });
    await workspace.appendEvent(RUN_FAILURE_EVENT[failure.status], {
        run_id: runId,
        error: failure.error
    });
}

/** A run that stopped because the operator holds something the agent cannot obtain for itself. */
export async function blockAgentRun(
    workspace: InvestigationWorkspace,
    runId: string,
    capabilityRequests: readonly CapabilityRequest[]
): Promise<void> {
    await workspace.update((draft) => {
        const run = requiredById(draft.runs, runId);
        run.status = AgentRunStatus.BLOCKED;
        run.finished_at = new Date().toISOString();
    });
    await workspace.appendEvent(EventType.RUN_BLOCKED, {
        run_id: runId,
        capability_request_ids: capabilityRequests.map(({ id }) => id)
    });
}
