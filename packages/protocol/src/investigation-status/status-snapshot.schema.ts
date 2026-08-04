import { z } from "zod";
import { AgentRunSchema } from "#src/agent-runs/agent-run.schema";
import { AssumptionSchema } from "#src/assumptions/assumption.schema";
import { CapabilityRequestSchema } from "#src/capabilities/capability-request.schema";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { FindingSchema } from "#src/findings/finding.schema";
import { InvestigationEventSchema } from "#src/investigation-events/investigation-event.schema";
import { InvestigationStateSchema } from "#src/investigation-lifecycle/investigation-state.schema";
import { ResultSummarySchema } from "#src/investigation-status/result-summary.schema";
import { VerdictSchema } from "#src/verdicts/verdict.schema";

export const StatusSnapshotSchema = z.object({
    investigation: z.object({
        id: IdentifierSchema,
        state: InvestigationStateSchema,
        goal: z.string().min(1),
        started_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),
        uptime_ms: z.number().nonnegative(),
        reason: z.string().optional()
    }),
    assumptions: z.array(AssumptionSchema).default([]),
    runs: z.array(AgentRunSchema).default([]),
    findings: z.array(FindingSchema).default([]),
    verdicts: z.array(VerdictSchema).default([]),
    capability_requests: z.array(CapabilityRequestSchema).default([]),
    recent_events: z.array(InvestigationEventSchema).default([]),
    /** The confirmed finding this investigation stopped on. Present exactly when the investigation reached a breakthrough. */
    breakthrough_finding_id: IdentifierSchema.optional(),
    result: ResultSummarySchema.optional()
});
