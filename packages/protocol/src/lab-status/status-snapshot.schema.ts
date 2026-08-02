import { z } from "zod";
import { AgentSummarySchema } from "#src/agents/agent-summary.schema";
import { BranchSummarySchema } from "#src/branches/branch-summary.schema";
import { CapabilityRequestSchema } from "#src/capabilities/capability-request.schema";
import { ClaimSchema } from "#src/claims/claim.schema";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { ExperimentSchema } from "#src/experiments/experiment.schema";
import { LabEventSchema } from "#src/lab-events/lab-event.schema";
import { LabStateSchema } from "#src/lab-lifecycle/lab-state.schema";
import { ResultSummarySchema } from "#src/lab-status/result-summary.schema";
import { FrontierSnapshotSchema } from "#src/research-frontier/frontier-snapshot.schema";
import { InternalTaskSchema } from "#src/task-queue/internal-task.schema";

export const StatusSnapshotSchema = z.object({
    lab: z.object({
        id: IdentifierSchema,
        state: LabStateSchema,
        goal: z.string().min(1),
        started_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),
        uptime_ms: z.number().nonnegative(),
        reason: z.string().optional()
    }),
    frontier: FrontierSnapshotSchema,
    branches: z.array(BranchSummarySchema).default([]),
    agents: z.array(AgentSummarySchema).default([]),
    tasks: z.array(InternalTaskSchema).default([]),
    claims: z.array(ClaimSchema).default([]),
    experiments: z.array(ExperimentSchema).default([]),
    capability_requests: z.array(CapabilityRequestSchema).default([]),
    recent_events: z.array(LabEventSchema).default([]),
    result: ResultSummarySchema.optional()
});
