import { randomUUID } from "node:crypto";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AssumptionStatus } from "@lab/protocol/assumptions/assumption-status.const";
import {
    CapabilityRequestType,
    CapabilityStatus
} from "@lab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@lab/protocol/findings/finding-status.const";
import type { InvestigationEvent } from "@lab/protocol/investigation-events/investigation-event.types";
import { DEFAULT_HARNESS_KINDS } from "@lab/protocol/investigation-input/investigation-input.const";
import type { InvestigationInput } from "@lab/protocol/investigation-input/investigation-input.types";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";

const testRunId = randomUUID();

export function testInvestigationId(name: string): string {
    return `investigation-${testRunId}-${name}`;
}

export function testEventId(investigationId: string, name: string): string {
    return `${investigationId}-${name}`;
}

export function makeInput(): InvestigationInput {
    return {
        goal: "Find a reproducible result",
        context: ["Known observation"],
        success_criteria: ["Independent reproduction"],
        harness_kinds: [...DEFAULT_HARNESS_KINDS]
    };
}

export function makeSnapshot(
    investigationId: string,
    input: InvestigationInput = makeInput(),
    state: InvestigationState = InvestigationState.RUNNING
): StatusSnapshot {
    const timestamp = "2026-08-02T00:00:00.000Z";
    const assumptionId = `${investigationId}-assumption-cache`;
    const directorRunId = `${investigationId}-run-director`;
    const researcherRunId = `${investigationId}-run-researcher`;
    const verifierRunId = `${investigationId}-run-verifier`;
    const findingId = `${investigationId}-finding-primary`;
    return {
        investigation: {
            id: investigationId,
            state,
            goal: input.goal,
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
                id: `${investigationId}-capability-sandbox`,
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
    type: InvestigationEvent["type"],
    investigationId: string,
    id: string,
    occurredAt = "2026-08-02T00:00:00.000Z"
): InvestigationEvent {
    return {
        id: testEventId(investigationId, id),
        investigation_id: investigationId,
        type,
        occurred_at: occurredAt,
        payload: { source: "runtime-integration-test" }
    };
}
