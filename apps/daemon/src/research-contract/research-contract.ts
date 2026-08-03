import { CapabilityResourceClass } from "@lab/protocol/capabilities/capability-request.const";
import { SourceClassification } from "@lab/protocol/evidence/source-evidence.const";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
import { z } from "zod";
import { evaluateDormantCapabilityDirection } from "#src/research-contract/director-direction-policy";
import { DormantCapabilityPolicyDecision } from "#src/research-contract/director-direction-policy.const";
import type { DormantCapabilityPolicyContext } from "#src/research-contract/director-direction-policy.types";
import {
    CRITIC_VERDICT,
    DIRECTOR_PLAN_VALIDATION_ERROR,
    EVALUATOR_VERDICT,
    RESEARCH_OUTCOME,
    RESEARCH_TARGET_KIND,
    VERIFIER_VERDICT
} from "#src/research-contract/research-contract.const";

const AssumptionSchema = z.object({
    statement: z.string().min(1),
    reason: z.string().min(1),
    risk: z.string().min(1),
    falsification_test: z.string().min(1)
});

const ClaimCandidateSchema = z.object({
    statement: z.string().min(1),
    evaluator: z.string().min(1),
    success_condition: z.string().min(1)
});

const ResearchDirectionSchema = z.object({
    title: z.string().min(1),
    approach: z.string().min(1),
    rationale: z.string().min(1),
    objective: z.string().min(1)
});

export const CapabilityRequestCandidateSchema = z.object({
    need: z.string().trim().min(1),
    resource_class: z.enum(CapabilityResourceClass),
    reason: z.string().trim().min(1),
    provisioning_hint: z.string().trim().min(1)
});

const CapabilityRequestCandidatesSchema = z.array(CapabilityRequestCandidateSchema).default([]);

function normalizedDirectionKey(direction: z.infer<typeof ResearchDirectionSchema>): string {
    return [direction.approach, direction.objective]
        .map((value) =>
            value
                .normalize("NFKC")
                .toLocaleLowerCase("en-US")
                .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
                .trim()
        )
        .join("\u0000");
}

export const EvaluatorPrecommitSchema = z.object({
    target_kind: z.enum(RESEARCH_TARGET_KIND),
    target_index: z.int().nonnegative(),
    evaluator_path: z.string().min(1),
    args: z.array(z.string()),
    success_contract: z.string().min(1)
});

export const ResearchEvaluatorPrecommitSchema = z.object({
    evaluators: z.array(EvaluatorPrecommitSchema).min(1)
});

const EvaluatorCheckSchema = z.object({
    name: z.string().min(1),
    passed: z.boolean(),
    observed: z.string().min(1),
    expected: z.string().min(1)
});

export const EvaluatorStructuredVerdictSchema = z.object({
    schema_version: z.literal(1),
    verdict: z.enum(EVALUATOR_VERDICT),
    target_statement_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    input_binding_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    artifact_sha256s: z.array(z.string().regex(/^[a-f0-9]{64}$/u)).min(1),
    success_contract: z.string().min(1),
    checks: z.array(EvaluatorCheckSchema).min(1),
    summary: z.string().min(1)
});

const DefaultDormantCapabilityPolicyContext: DormantCapabilityPolicyContext = {
    recovered: false,
    frontierBlockers: []
};

function createDirectorPlanSchema(
    assumptionsSchema: z.ZodArray<typeof AssumptionSchema>,
    policyContext: DormantCapabilityPolicyContext = DefaultDormantCapabilityPolicyContext
) {
    return z
        .object({
            operational_goal: z.string().min(1),
            assumptions: assumptionsSchema,
            claims: z.array(ClaimCandidateSchema).min(1),
            directions: z.array(ResearchDirectionSchema).min(2),
            capability_requests: CapabilityRequestCandidatesSchema
        })
        .superRefine((plan, context) => {
            const firstIndexByDirection = new Map<string, number>();
            for (const [index, direction] of plan.directions.entries()) {
                const policyResult = evaluateDormantCapabilityDirection(direction, policyContext);
                if (policyResult.decision === DormantCapabilityPolicyDecision.DENY) {
                    context.addIssue({
                        code: "custom",
                        path: ["directions", index],
                        message: policyResult.reason
                    });
                }
                const key = normalizedDirectionKey(direction);
                const firstIndex = firstIndexByDirection.get(key);
                if (firstIndex === undefined) {
                    firstIndexByDirection.set(key, index);
                    continue;
                }
                context.addIssue({
                    code: "custom",
                    path: ["directions", index],
                    message: `Research direction duplicates normalized approach and objective at index ${firstIndex}`
                });
            }
        });
}

export const DirectorPlanSchema = createDirectorPlanSchema(z.array(AssumptionSchema));

export function directorPlanSchema(
    task: Pick<TaskInput, "success_criteria">,
    policyContext: DormantCapabilityPolicyContext = DefaultDormantCapabilityPolicyContext
): typeof DirectorPlanSchema {
    if (task.success_criteria.length > 0) {
        return createDirectorPlanSchema(z.array(AssumptionSchema), policyContext);
    }

    return createDirectorPlanSchema(
        z
            .array(AssumptionSchema)
            .min(1, DIRECTOR_PLAN_VALIDATION_ERROR.MISSING_OPERATIONAL_CRITERION),
        policyContext
    );
}

const ResearchEvidenceSchema = z.object({
    target_kind: z.enum(RESEARCH_TARGET_KIND),
    target_index: z.int().nonnegative(),
    summary: z.string().min(1),
    artifact_paths: z.array(z.string().trim().min(1)).min(1),
    contradicts_hypothesis: z.boolean()
});

const ResearchSourceCandidateSchema = z.object({
    target_kind: z.enum(RESEARCH_TARGET_KIND),
    target_index: z.int().nonnegative(),
    url: z.url(),
    title: z.string().trim().min(1),
    claimed_classification: z.enum(SourceClassification)
});

export const ResearchResultSchema = z
    .object({
        summary: z.string().min(1),
        hypothesis: z.string().min(1),
        outcome: z.enum(RESEARCH_OUTCOME),
        evidence: z.array(ResearchEvidenceSchema),
        sources: z.array(ResearchSourceCandidateSchema).default([]),
        limitations: z.array(z.string()),
        next_experiments: z.array(z.string()),
        capability_requests: CapabilityRequestCandidatesSchema,
        capability_blocked: z.boolean().default(false)
    })
    .superRefine((result, context) => {
        if (result.capability_blocked && result.capability_requests.length === 0) {
            context.addIssue({
                code: "custom",
                path: ["capability_blocked"],
                message: "A resource-blocked result must include a concrete capability request"
            });
        }
        if (result.capability_blocked && result.evidence.length > 0) {
            context.addIssue({
                code: "custom",
                path: ["evidence"],
                message: "A resource-blocked result cannot also report material evidence"
            });
        }
        if (
            !result.capability_blocked &&
            result.evidence.length === 0 &&
            result.sources.length === 0
        ) {
            context.addIssue({
                code: "custom",
                path: ["evidence"],
                message: "A result requires a material artifact or a source candidate"
            });
        }
        if (
            result.evidence.length === 0 &&
            result.sources.length > 0 &&
            result.outcome !== RESEARCH_OUTCOME.INCONCLUSIVE
        ) {
            context.addIssue({
                code: "custom",
                path: ["outcome"],
                message: "A source-only result must remain inconclusive"
            });
        }
    });

export const CriticResultSchema = z.object({
    verdict: z.enum(CRITIC_VERDICT),
    summary: z.string().min(1),
    issues: z.array(z.string()),
    counterexamples: z.array(z.string()),
    claims_to_verify: z.array(z.string()),
    next_experiments: z.array(z.string()),
    verification_evaluator: EvaluatorPrecommitSchema,
    capability_requests: CapabilityRequestCandidatesSchema
});

export const VerifierResultSchema = z
    .object({
        verdict: z.enum(VERIFIER_VERDICT),
        claim_index: z.int().nonnegative(),
        result_statement: z.string().min(1),
        evidence_artifact_paths: z.array(z.string().trim().min(1)),
        limitations: z.array(z.string()),
        known_counterexamples: z.array(z.string()),
        capability_requests: CapabilityRequestCandidatesSchema,
        capability_blocked: z.boolean().default(false)
    })
    .superRefine((result, context) => {
        if (result.capability_blocked && result.capability_requests.length === 0) {
            context.addIssue({
                code: "custom",
                path: ["capability_blocked"],
                message: "A blocked verifier requires a concrete capability request"
            });
        }
        if (result.capability_blocked && result.evidence_artifact_paths.length > 0) {
            context.addIssue({
                code: "custom",
                path: ["evidence_artifact_paths"],
                message: "A blocked verifier cannot also report reproduction artifacts"
            });
        }
        if (!result.capability_blocked && result.evidence_artifact_paths.length === 0) {
            context.addIssue({
                code: "custom",
                path: ["evidence_artifact_paths"],
                message: "An unblocked verifier requires at least one reproduction artifact"
            });
        }
    });

export type DirectorPlan = z.infer<typeof DirectorPlanSchema>;
export type CapabilityRequestCandidate = z.infer<typeof CapabilityRequestCandidateSchema>;
export type EvaluatorPrecommit = z.infer<typeof EvaluatorPrecommitSchema>;
export type EvaluatorStructuredVerdict = z.infer<typeof EvaluatorStructuredVerdictSchema>;
export type ResearchResult = z.infer<typeof ResearchResultSchema>;
export type CriticResult = z.infer<typeof CriticResultSchema>;
export type VerifierResult = z.infer<typeof VerifierResultSchema>;
