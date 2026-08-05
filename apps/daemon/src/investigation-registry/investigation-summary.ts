import { AgentRunStatus } from "@nightlab/protocol/agent-runs/agent-run-status.const";
import { CapabilityStatus } from "@nightlab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@nightlab/protocol/findings/finding-status.const";
import type { InvestigationSummary } from "@nightlab/protocol/investigation-status/investigation-summary.types";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";

/** What one investigation looks like from the roster: the goal, the state, and the ground covered. */
export function summarizeInvestigation(workspace: InvestigationWorkspace): InvestigationSummary {
    const snapshot = workspace.getSnapshot();
    return {
        id: snapshot.investigation.id,
        goal: snapshot.investigation.goal,
        state: snapshot.investigation.state,
        ...(snapshot.investigation.reason === undefined
            ? {}
            : { reason: snapshot.investigation.reason }),
        started_at: snapshot.investigation.started_at,
        updated_at: snapshot.investigation.updated_at,
        uptime_ms: snapshot.investigation.uptime_ms,
        harness_kinds: workspace.input.harness_kinds,
        assumption_count: snapshot.assumptions.length,
        finding_count: snapshot.findings.length,
        confirmed_finding_count: snapshot.findings.filter(
            ({ status }) => status === FindingStatus.CONFIRMED
        ).length,
        open_capability_count: snapshot.capability_requests.filter(
            ({ status }) => status === CapabilityStatus.OPEN
        ).length,
        active_run_count: snapshot.runs.filter(({ status }) => status === AgentRunStatus.RUNNING)
            .length
    };
}
