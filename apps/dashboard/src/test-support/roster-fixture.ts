import { AgentHarnessKind } from "@nightlab/protocol/agents/agent-execution.const";
import { InvestigationState } from "@nightlab/protocol/investigation-lifecycle/investigation-state.const";
import type { InvestigationSummary } from "@nightlab/protocol/investigation-status/investigation-summary.types";

export const rosterFixture: InvestigationSummary[] = [
    {
        id: "investigation-alpha-2026",
        goal: "Find a provably faster route planner without sacrificing optimality",
        state: InvestigationState.RUNNING,
        started_at: "2026-08-02T09:00:00.000Z",
        updated_at: "2026-08-02T10:00:00.000Z",
        uptime_ms: 3_600_000,
        harness_kinds: [AgentHarnessKind.CODEX, AgentHarnessKind.CLAUDE],
        assumption_count: 3,
        finding_count: 2,
        confirmed_finding_count: 1,
        open_capability_count: 1,
        active_run_count: 2
    },
    {
        id: "investigation-beta-2026",
        goal: "Establish whether the eviction order explains the tail latency",
        state: InvestigationState.HIBERNATING,
        reason: "The director has no further bets to place",
        started_at: "2026-08-01T09:00:00.000Z",
        updated_at: "2026-08-01T18:00:00.000Z",
        uptime_ms: 32_400_000,
        harness_kinds: [AgentHarnessKind.GLM],
        assumption_count: 5,
        finding_count: 4,
        confirmed_finding_count: 0,
        open_capability_count: 0,
        active_run_count: 0
    }
];
