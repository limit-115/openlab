import { z } from "zod";
import { AgentRunSchema } from "#src/agent-runs/agent-run.schema";
import { CapabilityRequestSchema } from "#src/capabilities/capability-request.schema";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { FindingSchema } from "#src/findings/finding.schema";
import { InvestigationEventSchema } from "#src/investigation-events/investigation-event.schema";
import { InvestigationStateSchema } from "#src/investigation-lifecycle/investigation-state.schema";
import { ResultSummarySchema } from "#src/investigation-status/result-summary.schema";
import { LeadSchema } from "#src/leads/lead.schema";
import { VerdictSchema } from "#src/verdicts/verdict.schema";

export const StatusSnapshotSchema = z.object({
    investigation: z.object({
        id: IdentifierSchema,
        state: InvestigationStateSchema,
        goal: z.string().min(1),
        started_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),
        uptime_ms: z.number().nonnegative(),
        reason: z.string().optional(),
        /**
         * When the lab will put this investigation back to work by itself. It is set only where the
         * wait has a stated end — a subscription window that resets — so an investigation an
         * operator paused carries none and stays paused until they say otherwise.
         */
        resume_at: z.iso.datetime().optional()
    }),
    leads: z.array(LeadSchema).default([]),
    runs: z.array(AgentRunSchema).default([]),
    findings: z.array(FindingSchema).default([]),
    verdicts: z.array(VerdictSchema).default([]),
    capability_requests: z.array(CapabilityRequestSchema).default([]),
    recent_events: z.array(InvestigationEventSchema).default([]),
    /** The confirmed finding this investigation stopped on. Present exactly when the investigation reached a breakthrough. */
    breakthrough_finding_id: IdentifierSchema.optional(),
    result: ResultSummarySchema.optional()
});
