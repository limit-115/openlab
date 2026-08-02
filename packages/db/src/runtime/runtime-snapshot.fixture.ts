import { randomUUID } from "node:crypto";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import {
    CapabilityRequestType,
    CapabilityResourceClass,
    CapabilityStatus
} from "@lab/protocol/capabilities/capability-request.const";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import {
    SourceClassification,
    SourceRetrievalMethod
} from "@lab/protocol/evidence/source-evidence.const";
import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";

const testRunId = randomUUID();

export function testLabId(name: string): string {
    return `lab-${testRunId}-${name}`;
}

export function testEventId(labId: string, name: string): string {
    return `${labId}-${name}`;
}

export function makeTask(id = "lab-runtime"): TaskInput {
    return {
        id,
        goal: "Find a reproducible result",
        context: ["Known observation"],
        success_criteria: ["Independent reproduction"]
    };
}

export function makeSnapshot(task: TaskInput, state: LabState = LabState.RUNNING): StatusSnapshot {
    const labId = task.id ?? "lab-runtime";
    const timestamp = "2026-08-02T00:00:00.000Z";
    const branchId = `${labId}-branch-director`;
    const taskId = `${labId}-task-director`;
    const assumptionId = `${labId}-claim-assumption`;
    const claimId = `${labId}-claim-primary`;
    return {
        lab: {
            id: labId,
            state,
            goal: task.goal,
            started_at: timestamp,
            updated_at: timestamp,
            uptime_ms: 0
        },
        frontier: {
            known: [...task.context],
            open_questions: [...task.success_criteria],
            blockers: [],
            next_experiments: ["Run a controlled experiment"],
            updated_at: timestamp
        },
        branches: [
            {
                id: branchId,
                title: "Operationalization",
                approach: "Produce falsifiable claims",
                status: BranchStatus.ACTIVE,
                progress: "Ready"
            }
        ],
        agents: [
            {
                id: `${labId}-agent-director`,
                branch_id: branchId,
                role: AgentRole.DIRECTOR,
                status: AgentStatus.WORKING,
                current_task_id: taskId
            }
        ],
        tasks: [
            {
                id: taskId,
                branch_id: branchId,
                objective: "Operationalize the goal",
                context_refs: [],
                status: InternalTaskStatus.RUNNING,
                attempt: 1,
                role: AgentRole.DIRECTOR
            }
        ],
        claims: [
            {
                id: assumptionId,
                branch_id: branchId,
                statement: "The evaluator measures the target outcome",
                status: ClaimStatus.SUPPORTED,
                assumption_ids: [],
                supporting_evidence_ids: [],
                contradicting_evidence_ids: [],
                stale: false,
                created_at: timestamp,
                updated_at: timestamp
            },
            {
                id: claimId,
                branch_id: branchId,
                statement: "The primary approach is reproducible",
                status: ClaimStatus.PROPOSED,
                assumption_ids: [assumptionId],
                supporting_evidence_ids: [],
                contradicting_evidence_ids: [],
                stale: false,
                created_at: timestamp,
                updated_at: timestamp
            }
        ],
        experiments: [],
        capability_requests: [
            {
                id: `${labId}-capability-sandbox`,
                type: CapabilityRequestType.CAPABILITY_REQUEST,
                need: "A quiescent dedicated benchmarking host",
                resource_class: CapabilityResourceClass.HARDWARE,
                reason: "The evaluator must measure without neighbouring load",
                provisioning_hint: "Reserve a bare-metal host and expose it to the run",
                status: CapabilityStatus.OPEN,
                created_at: timestamp
            }
        ],
        recent_events: [],
        result: {
            summary: "Work in progress",
            limitations: []
        }
    };
}

export function makeEvent(
    type: LabEvent["type"],
    labId: string,
    id: string,
    occurredAt = "2026-08-02T00:00:00.000Z"
): LabEvent {
    return {
        id: testEventId(labId, id),
        lab_id: labId,
        type,
        occurred_at: occurredAt,
        payload: { source: "runtime-integration-test" }
    };
}

export function makeEvidence(
    labId: string,
    claimId: string,
    experimentId: string,
    verifierTaskId: string
): Evidence[] {
    const createdAt = "2026-08-02T00:01:30.000Z";
    return [
        {
            id: `${labId}-evidence-experiment`,
            kind: EvidenceKind.EXPERIMENT,
            claim_id: claimId,
            run_id: experimentId,
            artifact_path: "artifacts/experiment.json",
            artifact_hash: "a".repeat(64),
            summary: "The evaluator measured a stable result",
            supports: true,
            independent: false,
            created_at: createdAt
        },
        {
            id: `${labId}-evidence-verifier`,
            kind: EvidenceKind.VERIFIER_RESULT,
            claim_id: claimId,
            run_id: verifierTaskId,
            artifact_path: "artifacts/verifier.json",
            artifact_hash: "c".repeat(64),
            summary: "The independent verifier reproduced the result",
            supports: true,
            independent: true,
            created_at: createdAt
        },
        {
            id: `${labId}-evidence-counterexample`,
            kind: EvidenceKind.COUNTEREXAMPLE,
            claim_id: claimId,
            artifact_path: "artifacts/counterexample.json",
            artifact_hash: "d".repeat(64),
            summary: "A bounded counterexample remains",
            supports: false,
            independent: false,
            created_at: createdAt
        },
        {
            id: `${labId}-evidence-source`,
            kind: EvidenceKind.SOURCE,
            claim_id: claimId,
            run_id: experimentId,
            artifact_path: "artifacts/source.html",
            artifact_hash: "e".repeat(64),
            summary: "A daemon-fetched citation",
            supports: false,
            independent: false,
            source: {
                requested_url: "https://example.com/paper",
                final_url: "https://example.com/paper",
                title: "Example paper",
                claimed_classification: SourceClassification.PRIMARY,
                retrieval_method: SourceRetrievalMethod.DAEMON_HTTP,
                http_status: 200,
                fetched_at: createdAt
            },
            created_at: createdAt
        }
    ];
}
