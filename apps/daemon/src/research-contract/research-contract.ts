import { z } from "zod";

export const CapabilityRequestCandidateSchema = z.object({
    need: z.string().trim().min(1),
    reason: z.string().trim().min(1),
    provisioning_hint: z.string().trim().min(1),
    self_provisioning_attempt: z.string().trim().min(1)
});

const CapabilityRequestCandidatesSchema = z.array(CapabilityRequestCandidateSchema).default([]);

const AssumptionCandidateSchema = z.object({
    statement: z.string().trim().min(1),
    rationale: z.string().trim().min(1)
});

/**
 * What the director comes back with. `reconnaissance` is its own account of what it looked at
 * before betting, kept because the next director round reads it. The bets themselves carry no
 * evaluator, no success contract and no falsification test: a researcher decides what testing its
 * bet means.
 */
export const DirectorPlanSchema = z.object({
    reconnaissance: z.string().trim().min(1),
    assumptions: z.array(AssumptionCandidateSchema).min(1),
    capability_requests: CapabilityRequestCandidatesSchema
});

/**
 * What a researcher comes back with. Either it found something, and then it says what it claims and
 * how it got there, or it did not, and the bet is closed on the strength of `work` alone.
 */
export const ResearchResultSchema = z
    .object({
        found: z.boolean(),
        claim: z.string().trim().min(1).optional(),
        work: z.string().trim().min(1),
        artifact_paths: z.array(z.string().trim().min(1)).default([]),
        capability_requests: CapabilityRequestCandidatesSchema,
        capability_blocked: z.boolean().default(false)
    })
    .superRefine((result, context) => {
        if (result.found && result.claim === undefined) {
            context.addIssue({
                code: "custom",
                path: ["claim"],
                message: "A finding must state what it claims"
            });
        }
        if (result.capability_blocked && result.capability_requests.length === 0) {
            context.addIssue({
                code: "custom",
                path: ["capability_blocked"],
                message: "A resource-blocked result must include a concrete capability request"
            });
        }
    });

/**
 * What a verifier comes back with. Two answers, not one: whether the claim is true, and whether that
 * true claim on its own reaches the goal. A claim can hold and still fall short of what the
 * investigation was sent to find, so only a finding that is both becomes a breakthrough.
 */
export const VerificationResultSchema = z
    .object({
        confirmed: z.boolean(),
        meets_goal: z.boolean(),
        reasoning: z.string().trim().min(1),
        capability_requests: CapabilityRequestCandidatesSchema,
        capability_blocked: z.boolean().default(false)
    })
    .superRefine((result, context) => {
        if (result.capability_blocked && result.confirmed) {
            context.addIssue({
                code: "custom",
                path: ["confirmed"],
                message: "A verifier that could not run cannot confirm a finding"
            });
        }
        if (result.meets_goal && !result.confirmed) {
            context.addIssue({
                code: "custom",
                path: ["meets_goal"],
                message: "A claim that is not confirmed true cannot reach the goal"
            });
        }
    });

export type CapabilityRequestCandidate = z.infer<typeof CapabilityRequestCandidateSchema>;
export type DirectorPlan = z.infer<typeof DirectorPlanSchema>;
export type AssumptionCandidate = z.infer<typeof AssumptionCandidateSchema>;
export type ResearchResult = z.infer<typeof ResearchResultSchema>;
export type VerificationResult = z.infer<typeof VerificationResultSchema>;
