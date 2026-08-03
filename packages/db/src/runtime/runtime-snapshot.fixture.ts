import { randomUUID } from "node:crypto";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AssumptionStatus } from "@lab/protocol/assumptions/assumption-status.const";
import {
    CapabilityRequestType,
    CapabilityStatus
} from "@lab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@lab/protocol/findings/finding-status.const";
import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";

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
    const assumptionId = `${labId}-assumption-cache`;
    const directorRunId = `${labId}-run-director`;
    const researcherRunId = `${labId}-run-researcher`;
    const verifierRunId = `${labId}-run-verifier`;
    const findingId = `${labId}-finding-primary`;
    return {
        lab: {
            id: labId,
            state,
            goal: task.goal,
            started_at: timestamp,
            updated_at: timestamp,
            uptime_ms: 0
        },
        assumptions: [
            {
                id: assumptionId,
                cycle: 0,
                statement: "The bottleneck is the cache eviction order",
                rationale: "Nothing in the literature measures eviction under this access pattern",
                status: AssumptionStatus.RESEARCHING,
                created_at: timestamp,
                updated_at: timestamp
            }
        ],
        runs: [
            {
                id: directorRunId,
                role: AgentRole.DIRECTOR,
                objective: "Turn the goal into bets worth taking",
                status: AgentRunStatus.SUCCEEDED,
                cwd: "/tmp/lab/director",
                started_at: timestamp,
                finished_at: timestamp
            },
            {
                id: researcherRunId,
                role: AgentRole.RESEARCHER,
                assumption_id: assumptionId,
                objective: "Reach the goal through the eviction order",
                status: AgentRunStatus.SUCCEEDED,
                cwd: "/tmp/lab/researcher",
                started_at: timestamp,
                finished_at: timestamp
            },
            {
                id: verifierRunId,
                role: AgentRole.VERIFIER,
                assumption_id: assumptionId,
                objective: "Check the eviction claim independently",
                status: AgentRunStatus.RUNNING,
                cwd: "/tmp/lab/verifier",
                started_at: timestamp
            }
        ],
        findings: [
            {
                id: findingId,
                assumption_id: assumptionId,
                run_id: researcherRunId,
                claim: "Reordering eviction by access recency removes the stall entirely",
                work: "Patched the allocator, ran the workload 40 times, stall disappeared in all runs",
                artifact_paths: ["artifacts/bench.json"],
                status: FindingStatus.UNVERIFIED,
                created_at: timestamp
            }
        ],
        verdicts: [],
        capability_requests: [
            {
                id: `${labId}-capability-sandbox`,
                type: CapabilityRequestType.CAPABILITY_REQUEST,
                need: "A quiescent dedicated benchmarking host",
                reason: "The measurement needs a machine without neighbouring load",
                provisioning_hint: "Reserve a bare-metal host and expose it to the run",
                self_provisioning_attempt:
                    "Pinned cores and stopped local services, and the variance stayed above the effect size",
                blocking: true,
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
