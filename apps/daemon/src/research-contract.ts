import { z } from "zod";

export const RESEARCH_OUTCOME = {
    SUPPORTED: "supported",
    REFUTED: "refuted",
    INCONCLUSIVE: "inconclusive"
} as const;

export const CRITIC_VERDICT = {
    CREDIBLE: "credible",
    WEAK: "weak",
    REFUTED: "refuted"
} as const;

export const VERIFIER_VERDICT = {
    REPRODUCED: "reproduced",
    REFUTED: "refuted",
    INCONCLUSIVE: "inconclusive"
} as const;

export const EVALUATOR_VERDICT = {
    SUPPORTS: "supports",
    CONTRADICTS: "contradicts",
    INCONCLUSIVE: "inconclusive"
} as const;

export const RESEARCH_TARGET_KIND = {
    CLAIM: "claim",
    ASSUMPTION: "assumption"
} as const;
export type ResearchTargetKind = (typeof RESEARCH_TARGET_KIND)[keyof typeof RESEARCH_TARGET_KIND];

function domainValues<const Domain extends Readonly<Record<string, string>>>(
    domain: Domain
): [Domain[keyof Domain], ...Domain[keyof Domain][]] {
    const values = Object.values(domain) as Domain[keyof Domain][];
    const first = values[0];
    if (first === undefined) {
        throw new Error("A structured-output domain cannot be empty");
    }
    return [first, ...values.slice(1)];
}

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
    target_kind: z.enum(domainValues(RESEARCH_TARGET_KIND)),
    target_index: z.number().int().nonnegative(),
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
    verdict: z.enum(domainValues(EVALUATOR_VERDICT)),
    target_statement_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    input_binding_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    artifact_sha256s: z.array(z.string().regex(/^[a-f0-9]{64}$/u)).min(1),
    success_contract: z.string().min(1),
    checks: z.array(EvaluatorCheckSchema).min(1),
    summary: z.string().min(1)
});

export const DirectorPlanSchema = z
    .object({
        operational_goal: z.string().min(1),
        assumptions: z.array(AssumptionSchema),
        claims: z.array(ClaimCandidateSchema).min(1),
        directions: z.array(ResearchDirectionSchema).min(2)
    })
    .superRefine((plan, context) => {
        const firstIndexByDirection = new Map<string, number>();
        for (const [index, direction] of plan.directions.entries()) {
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

const ResearchEvidenceSchema = z.object({
    target_kind: z.enum(domainValues(RESEARCH_TARGET_KIND)),
    target_index: z.number().int().nonnegative(),
    summary: z.string().min(1),
    artifact_paths: z.array(z.string()),
    contradicts_hypothesis: z.boolean()
});

export const ResearchResultSchema = z.object({
    summary: z.string().min(1),
    hypothesis: z.string().min(1),
    outcome: z.enum(domainValues(RESEARCH_OUTCOME)),
    evidence: z.array(ResearchEvidenceSchema),
    limitations: z.array(z.string()),
    next_experiments: z.array(z.string())
});

export const CriticResultSchema = z.object({
    verdict: z.enum(domainValues(CRITIC_VERDICT)),
    summary: z.string().min(1),
    issues: z.array(z.string()),
    counterexamples: z.array(z.string()),
    claims_to_verify: z.array(z.string()),
    next_experiments: z.array(z.string()),
    verification_evaluator: EvaluatorPrecommitSchema
});

export const VerifierResultSchema = z.object({
    verdict: z.enum(domainValues(VERIFIER_VERDICT)),
    claim_index: z.number().int().nonnegative(),
    result_statement: z.string().min(1),
    evidence_artifact_paths: z.array(z.string()),
    limitations: z.array(z.string()),
    known_counterexamples: z.array(z.string())
});

export type DirectorPlan = z.infer<typeof DirectorPlanSchema>;
export type EvaluatorPrecommit = z.infer<typeof EvaluatorPrecommitSchema>;
export type EvaluatorStructuredVerdict = z.infer<typeof EvaluatorStructuredVerdictSchema>;
export type ResearchResult = z.infer<typeof ResearchResultSchema>;
export type CriticResult = z.infer<typeof CriticResultSchema>;
export type VerifierResult = z.infer<typeof VerifierResultSchema>;

export function structuredOutputSchema(schema: z.ZodType): Readonly<Record<string, unknown>> {
    return z.toJSONSchema(schema, { target: "draft-7" }) as Readonly<Record<string, unknown>>;
}
