import { randomUUID } from "node:crypto";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import type { AgentRole } from "@lab/protocol/agents/agent-role.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { requiredById } from "#src/lab-workspace/snapshot-entities";
import { RUN_FAILURE_EVENT } from "#src/research-cycle/agent-run-lifecycle.const";
import type {
    AgentRunFailure,
    StartAgentRunInput
} from "#src/research-cycle/agent-run-lifecycle.types";

export function newAgentRunId(role: AgentRole): string {
    return `run-${role}-${randomUUID()}`;
}

export async function startAgentRun(
    workspace: LabWorkspace,
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
    workspace: LabWorkspace,
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
    workspace: LabWorkspace,
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
    workspace: LabWorkspace,
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
