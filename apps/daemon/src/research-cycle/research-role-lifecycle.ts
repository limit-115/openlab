import { randomUUID } from "node:crypto";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { requiredById } from "#src/lab-workspace/snapshot-entities";
import { initialResearchIdentifiers } from "#src/research-cycle/research-identifiers";
import { BranchProgress } from "#src/research-cycle/research-loop.const";
import type { RoleIdentifiers } from "#src/research-cycle/research-loop.types";
import { ResearchStage } from "#src/research-cycle/research-stage-workspace.const";
import { uniqueStrings } from "#src/research-cycle/unique-strings";

export function roleIdentifiers(
    stage: ResearchStage,
    cycle: number,
    ordinal: number
): RoleIdentifiers {
    const suffix = `${cycle}-${ordinal}-${randomUUID()}`;
    return {
        branchId: `branch-${stage}-${suffix}`,
        agentId: `agent-${stage}-${suffix}`,
        taskId: `task-${stage}-${suffix}`
    };
}

export async function prepareDirector(
    workspace: LabWorkspace,
    cycle: number
): Promise<RoleIdentifiers> {
    const initialIds = initialResearchIdentifiers(workspace.labId);
    const ids =
        cycle === 0
            ? {
                  branchId: initialIds.branchId,
                  agentId: initialIds.agentId,
                  taskId: initialIds.taskId
              }
            : roleIdentifiers(ResearchStage.DIRECTOR, cycle, 0);
    const snapshot = workspace.getSnapshot();
    if (!snapshot.branches.some(({ id }) => id === ids.branchId)) {
        await prepareRoleTask(
            workspace,
            ids,
            AgentRole.DIRECTOR,
            "Goal operationalization",
            "Turn the current frontier into independent falsifiable work"
        );
        return ids;
    }

    await workspace.update((draft) => {
        const branch = requiredById(draft.branches, ids.branchId);
        const agent = requiredById(draft.agents, ids.agentId);
        const task = requiredById(draft.tasks, ids.taskId);
        branch.status = BranchStatus.ACTIVE;
        branch.progress = BranchProgress.RUNNING;
        agent.status = AgentStatus.WORKING;
        agent.current_task_id = ids.taskId;
        task.status = InternalTaskStatus.RUNNING;
    });
    await workspace.appendEvent(EventType.TASK_STARTED, { task_id: ids.taskId });
    return ids;
}

export async function prepareRoleTask(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    role: (typeof AgentRole)[keyof typeof AgentRole],
    title: string,
    objective: string
): Promise<void> {
    await workspace.update((draft) => {
        draft.branches.push({
            id: ids.branchId,
            title,
            approach: objective,
            status: BranchStatus.ACTIVE,
            progress: BranchProgress.RUNNING
        });
        draft.agents.push({
            id: ids.agentId,
            branch_id: ids.branchId,
            role,
            status: AgentStatus.WORKING,
            current_task_id: ids.taskId
        });
        draft.tasks.push({
            id: ids.taskId,
            branch_id: ids.branchId,
            objective,
            context_refs: [],
            status: InternalTaskStatus.RUNNING,
            attempt: 1,
            role
        });
    });
    await workspace.appendEvent(EventType.BRANCH_CREATED, { branch_id: ids.branchId });
    await workspace.appendEvent(EventType.TASK_QUEUED, { task_id: ids.taskId });
    await workspace.appendEvent(EventType.TASK_STARTED, { task_id: ids.taskId });
}

export async function finishRoleTask(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    branchStatus: typeof BranchStatus.CLOSED | typeof BranchStatus.PAUSED
): Promise<void> {
    await workspace.update((draft) => {
        const branch = requiredById(draft.branches, ids.branchId);
        const agent = requiredById(draft.agents, ids.agentId);
        const task = requiredById(draft.tasks, ids.taskId);
        branch.status = branchStatus;
        branch.progress = BranchProgress.FINISHED;
        agent.status = AgentStatus.IDLE;
        delete agent.current_task_id;
        task.status = InternalTaskStatus.SUCCEEDED;
    });
    await workspace.appendEvent(EventType.TASK_SUCCEEDED, { task_id: ids.taskId });
    await workspace.appendEvent(
        branchStatus === BranchStatus.CLOSED ? EventType.BRANCH_CLOSED : EventType.BRANCH_PAUSED,
        { branch_id: ids.branchId }
    );
}

export async function pauseRoleForCapabilities(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    capabilityRequests: readonly CapabilityRequest[]
): Promise<void> {
    const capabilityRequestIds = capabilityRequests.map(({ id }) => id);
    await workspace.update((draft) => {
        const branch = requiredById(draft.branches, ids.branchId);
        const agent = requiredById(draft.agents, ids.agentId);
        const task = requiredById(draft.tasks, ids.taskId);
        branch.status = BranchStatus.PAUSED;
        branch.progress = BranchProgress.CAPABILITY_BLOCKED;
        agent.status = AgentStatus.BLOCKED;
        agent.current_task_id = ids.taskId;
        task.status = InternalTaskStatus.QUEUED;
        task.context_refs = uniqueStrings([...task.context_refs, ...capabilityRequestIds]);
    });
    await workspace.appendEvent(EventType.TASK_QUEUED, {
        task_id: ids.taskId,
        capability_request_ids: capabilityRequestIds
    });
    await workspace.appendEvent(EventType.BRANCH_PAUSED, {
        branch_id: ids.branchId,
        capability_request_ids: capabilityRequestIds
    });
}

export async function failRoleTask(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    cancelled: boolean
): Promise<void> {
    await workspace.update((draft) => {
        const branch = requiredById(draft.branches, ids.branchId);
        const agent = requiredById(draft.agents, ids.agentId);
        const task = requiredById(draft.tasks, ids.taskId);
        branch.status = BranchStatus.PAUSED;
        branch.progress = cancelled ? BranchProgress.CANCELLED : BranchProgress.FAILED;
        agent.status = cancelled ? AgentStatus.STOPPED : AgentStatus.BLOCKED;
        delete agent.current_task_id;
        task.status = cancelled ? InternalTaskStatus.CANCELLED : InternalTaskStatus.FAILED;
    });
    await workspace.appendEvent(cancelled ? EventType.TASK_CANCELLED : EventType.TASK_FAILED, {
        task_id: ids.taskId
    });
    await workspace.appendEvent(EventType.BRANCH_PAUSED, { branch_id: ids.branchId });
}
