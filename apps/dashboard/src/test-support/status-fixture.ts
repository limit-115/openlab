import { AgentEffortLevel, AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import {
    CapabilityRequestType,
    CapabilityStatus
} from "@lab/protocol/capabilities/capability-request.const";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";

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
            current_task_id: "task-benchmark",
            execution: {
                harness: AgentHarnessKind.CODEX,
                model: "gpt-5.6-sol",
                effort: AgentEffortLevel.MEDIUM
            }
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
            self_provisioning_attempt:
                "Rebuilt a road network from OpenStreetMap extracts, which overlaps the development set",
            blocking: true,
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
