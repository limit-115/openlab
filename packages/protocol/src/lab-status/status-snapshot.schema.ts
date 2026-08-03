import { z } from "zod";
import { AgentRunSchema } from "#src/agent-runs/agent-run.schema";
import { AssumptionSchema } from "#src/assumptions/assumption.schema";
import { CapabilityRequestSchema } from "#src/capabilities/capability-request.schema";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { FindingSchema } from "#src/findings/finding.schema";
import { LabEventSchema } from "#src/lab-events/lab-event.schema";
import { LabStateSchema } from "#src/lab-lifecycle/lab-state.schema";
import { ResultSummarySchema } from "#src/lab-status/result-summary.schema";
import { VerdictSchema } from "#src/verdicts/verdict.schema";

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
    assumptions: z.array(AssumptionSchema).default([]),
    runs: z.array(AgentRunSchema).default([]),
    findings: z.array(FindingSchema).default([]),
    verdicts: z.array(VerdictSchema).default([]),
    capability_requests: z.array(CapabilityRequestSchema).default([]),
    recent_events: z.array(LabEventSchema).default([]),
    /** The confirmed finding this lab stopped on. Present exactly when the lab reached a breakthrough. */
    breakthrough_finding_id: IdentifierSchema.optional(),
    result: ResultSummarySchema.optional()
});
