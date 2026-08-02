export const LabState = {
    RUNNING: "RUNNING",
    HIBERNATING: "HIBERNATING",
    COMPLETED: "COMPLETED",
    STOPPED: "STOPPED",
    FAILED: "FAILED"
} as const;
export type LabState = (typeof LabState)[keyof typeof LabState];

export const AgentRole = {
    DIRECTOR: "director",
    RESEARCHER: "researcher",
    CRITIC: "critic",
    VERIFIER: "verifier"
} as const;
export type AgentRole = (typeof AgentRole)[keyof typeof AgentRole];

export const ClaimStatus = {
    PROPOSED: "proposed",
    TESTING: "testing",
    SUPPORTED: "supported",
    REFUTED: "refuted",
    REPRODUCED: "reproduced"
} as const;
export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

export const EvidenceKind = {
    EXPERIMENT: "experiment",
    SOURCE: "source",
    ARTIFACT: "artifact",
    COUNTEREXAMPLE: "counterexample",
    VERIFIER_RESULT: "verifier_result"
} as const;
export type EvidenceKind = (typeof EvidenceKind)[keyof typeof EvidenceKind];

export const InternalTaskStatus = {
    QUEUED: "queued",
    LEASED: "leased",
    RUNNING: "running",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    CANCELLED: "cancelled"
} as const;
export type InternalTaskStatus = (typeof InternalTaskStatus)[keyof typeof InternalTaskStatus];

export const ExperimentStatus = {
    PLANNED: "planned",
    RUNNING: "running",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    TIMED_OUT: "timed_out",
    CANCELLED: "cancelled"
} as const;
export type ExperimentStatus = (typeof ExperimentStatus)[keyof typeof ExperimentStatus];

export const CapabilityRequestType = {
    CAPABILITY_REQUEST: "capability_request"
} as const;
export type CapabilityRequestType =
    (typeof CapabilityRequestType)[keyof typeof CapabilityRequestType];

export const CapabilityStatus = {
    OPEN: "open",
    PROVIDED: "provided",
    OBSOLETE: "obsolete"
} as const;
export type CapabilityStatus = (typeof CapabilityStatus)[keyof typeof CapabilityStatus];

export const BranchStatus = {
    ACTIVE: "active",
    PAUSED: "paused",
    CLOSED: "closed"
} as const;
export type BranchStatus = (typeof BranchStatus)[keyof typeof BranchStatus];

export const AgentStatus = {
    IDLE: "idle",
    WORKING: "working",
    BLOCKED: "blocked",
    STOPPED: "stopped"
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const EventType = {
    LAB_STARTED: "lab.started",
    LAB_RECOVERED: "lab.recovered",
    LAB_STATE_CHANGED: "lab.state_changed",
    LAB_WOKEN: "lab.woken",
    LAB_HIBERNATED: "lab.hibernated",
    LAB_COMPLETED: "lab.completed",
    LAB_STOPPED: "lab.stopped",
    LAB_FAILED: "lab.failed",
    HARNESS_PREFLIGHT_SUCCEEDED: "harness.preflight_succeeded",
    HARNESS_PREFLIGHT_FAILED: "harness.preflight_failed",
    HARNESS_RUN_STARTED: "harness.run_started",
    HARNESS_RUN_SUCCEEDED: "harness.run_succeeded",
    HARNESS_RUN_FAILED: "harness.run_failed",
    HARNESS_RUN_TIMED_OUT: "harness.run_timed_out",
    HARNESS_RUN_CANCELLED: "harness.run_cancelled",
    GOAL_OPERATIONALIZED: "goal.operationalized",
    BRANCH_CREATED: "branch.created",
    BRANCH_PAUSED: "branch.paused",
    BRANCH_CLOSED: "branch.closed",
    TASK_QUEUED: "task.queued",
    TASK_LEASED: "task.leased",
    TASK_STARTED: "task.started",
    TASK_SUCCEEDED: "task.succeeded",
    TASK_FAILED: "task.failed",
    TASK_CANCELLED: "task.cancelled",
    ATTEMPT_PLANNED: "attempt.planned",
    ATTEMPT_STARTED: "attempt.started",
    ATTEMPT_SUCCEEDED: "attempt.succeeded",
    ATTEMPT_FAILED: "attempt.failed",
    ATTEMPT_TIMED_OUT: "attempt.timed_out",
    ATTEMPT_CANCELLED: "attempt.cancelled",
    CLAIM_PROPOSED: "claim.proposed",
    CLAIM_TESTING: "claim.testing",
    CLAIM_SUPPORTED: "claim.supported",
    CLAIM_REFUTED: "claim.refuted",
    CLAIM_REPRODUCED: "claim.reproduced",
    CLAIM_STALE: "claim.stale",
    EVIDENCE_RECORDED: "evidence.recorded",
    EXPERIMENT_PLANNED: "experiment.planned",
    EXPERIMENT_STARTED: "experiment.started",
    EXPERIMENT_SUCCEEDED: "experiment.succeeded",
    EXPERIMENT_FAILED: "experiment.failed",
    EXPERIMENT_TIMED_OUT: "experiment.timed_out",
    EXPERIMENT_CANCELLED: "experiment.cancelled",
    VERIFIER_VERDICT_RECORDED: "verifier.verdict_recorded",
    FRONTIER_UPDATED: "frontier.updated",
    PLATEAU_CONFIRMED: "plateau.confirmed",
    CAPABILITY_REQUESTED: "capability.requested",
    CAPABILITY_PROVIDED: "capability.provided",
    CAPABILITY_OBSOLETE: "capability.obsolete",
    REPORT_GENERATED: "report.generated",
    RESULT_GENERATED: "result.generated"
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export function domainValues<const Domain extends Readonly<Record<string, string>>>(
    domain: Domain
): [Domain[keyof Domain], ...Domain[keyof Domain][]] {
    const values = Object.values(domain) as Domain[keyof Domain][];
    const first = values[0];
    if (first === undefined) {
        throw new Error("A finite domain must contain at least one value");
    }
    return [first, ...values.slice(1)];
}
