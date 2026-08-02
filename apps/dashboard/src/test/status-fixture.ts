import {
    AgentRole,
    AgentStatus,
    BranchStatus,
    CapabilityRequestType,
    CapabilityStatus,
    ClaimStatus,
    EventType,
    ExperimentStatus,
    InternalTaskStatus,
    LabState
} from "@lab/protocol/constants";
import type { StatusSnapshot } from "@lab/protocol/status";

const now = "2026-08-02T10:00:00.000Z";

export const statusFixture: StatusSnapshot = {
    lab: {
        id: "lab-alpha-2026",
        state: LabState.RUNNING,
        goal: "Find a provably faster route planner without sacrificing optimality",
        started_at: "2026-08-02T09:00:00.000Z",
        updated_at: now,
        uptime_ms: 3_600_000
    },
    frontier: {
        known: ["Baseline A* expands 42% more nodes on held-out maps"],
        open_questions: ["Does the heuristic remain admissible on weighted terrain?"],
        blockers: ["Independent benchmark dataset is unavailable"],
        next_experiments: ["Run held-out weighted-map benchmark"],
        updated_at: now
    },
    branches: [
        {
            id: "branch-landmarks",
            title: "Landmark heuristics",
            approach: "Precompute sparse landmarks for tighter admissible estimates",
            status: BranchStatus.ACTIVE,
            progress: "Candidate heuristic implemented; held-out validation is next."
        }
    ],
    agents: [
        {
            id: "agent-researcher-1",
            branch_id: "branch-landmarks",
            role: AgentRole.RESEARCHER,
            status: AgentStatus.WORKING,
            current_task_id: "task-benchmark"
        }
    ],
    tasks: [
        {
            id: "task-benchmark",
            branch_id: "branch-landmarks",
            objective: "Benchmark candidate heuristic on held-out maps",
            context_refs: ["claim-speedup"],
            status: InternalTaskStatus.RUNNING,
            attempt: 1,
            role: AgentRole.RESEARCHER
        }
    ],
    claims: [
        {
            id: "claim-speedup",
            branch_id: "branch-landmarks",
            statement: "Sparse landmarks reduce node expansions without breaking optimality",
            status: ClaimStatus.SUPPORTED,
            assumption_ids: [],
            supporting_evidence_ids: ["evidence-benchmark-1"],
            contradicting_evidence_ids: [],
            stale: false,
            created_at: now,
            updated_at: now
        }
    ],
    experiments: [
        {
            id: "experiment-held-out",
            task_id: "task-benchmark",
            branch_id: "branch-landmarks",
            hypothesis: "The landmark heuristic cuts median expansions by at least 20%",
            evaluator: "Held-out optimality and expansion benchmark",
            command: "pnpm benchmark --dataset held-out",
            cwd: "/tmp/lab-alpha",
            status: ExperimentStatus.RUNNING,
            started_at: now
        }
    ],
    capability_requests: [
        {
            id: "capability-dataset",
            type: CapabilityRequestType.CAPABILITY_REQUEST,
            need: "Independent road-network benchmark dataset",
            reason: "Reproduction needs data not used during heuristic development",
            provisioning_hint: "Provide a local path or downloadable dataset URL",
            status: CapabilityStatus.OPEN,
            created_at: now
        }
    ],
    recent_events: [
        {
            id: "event-experiment-started",
            lab_id: "lab-alpha-2026",
            type: EventType.EXPERIMENT_STARTED,
            occurred_at: now,
            payload: {
                summary: "Held-out benchmark started"
            }
        }
    ]
};
