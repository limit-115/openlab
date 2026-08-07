import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import { AgentEffortLevel, AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { AgentRole } from "@openlab/protocol/agents/agent-role.const";
import {
    CapabilityRequestType,
    CapabilityStatus
} from "@openlab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@openlab/protocol/findings/finding-status.const";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { LeadStatus } from "@openlab/protocol/leads/lead-status.const";

const now = "2026-08-02T10:00:00.000Z";

export const statusFixture: StatusSnapshot = {
    investigation: {
        id: "investigation-alpha-2026",
        state: InvestigationState.RUNNING,
        goal: "Find a provably faster route planner without sacrificing optimality",
        started_at: "2026-08-02T09:00:00.000Z",
        updated_at: now,
        uptime_ms: 3_600_000
    },
    leads: [
        {
            id: "lead-landmarks",
            cycle: 0,
            statement: "Sparse landmarks are the part nobody has measured properly",
            rationale: "Every published comparison uses dense landmarks and stops there",
            status: LeadStatus.RESEARCHING,
            created_at: now,
            updated_at: now
        },
        {
            id: "lead-contraction",
            cycle: 0,
            statement: "Contraction hierarchies hide the real cost in preprocessing",
            rationale: "Preprocessing time is reported separately and never counted",
            status: LeadStatus.EXHAUSTED,
            outcome: "Preprocessing was already counted; the reported totals hold up",
            created_at: now,
            updated_at: now
        }
    ],
    runs: [
        {
            id: "run-researcher-landmarks",
            role: AgentRole.RESEARCHER,
            lead_id: "lead-landmarks",
            objective: "Reach the goal through sparse landmarks",
            status: AgentRunStatus.RUNNING,
            cwd: "/tmp/investigation-alpha/researcher-000",
            execution: {
                harness: AgentHarnessKind.CODEX,
                model: "gpt-5.6-sol",
                effort: AgentEffortLevel.MEDIUM
            },
            started_at: now
        }
    ],
    findings: [
        {
            id: "finding-landmarks",
            lead_id: "lead-landmarks",
            run_id: "run-researcher-landmarks",
            claim: "Sparse landmarks cut node expansions by 42% while staying admissible",
            work: "Implemented the heuristic, ran it over held-out maps, and checked optimality on every route",
            artifact_paths: ["artifacts/held-out-benchmark.json"],
            status: FindingStatus.UNVERIFIED,
            created_at: now
        }
    ],
    verdicts: [],
    capability_requests: [
        {
            id: "capability-dataset",
            type: CapabilityRequestType.CAPABILITY_REQUEST,
            need: "Independent road-network benchmark dataset",
            reason: "Verification needs data not used while developing the heuristic",
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
            id: "event-finding-claimed",
            investigation_id: "investigation-alpha-2026",
            type: EventType.FINDING_CLAIMED,
            occurred_at: now,
            payload: {
                summary: "The researcher claims a 42% cut in node expansions"
            }
        }
    ]
};
