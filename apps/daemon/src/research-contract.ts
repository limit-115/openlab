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

const EvaluatorCommandSchema = z.object({
    file: z.string().min(1),
    args: z.array(z.string())
});

export const DirectorPlanSchema = z.object({
    operational_goal: z.string().min(1),
    assumptions: z.array(AssumptionSchema),
    claims: z.array(ClaimCandidateSchema).min(1),
    directions: z.array(ResearchDirectionSchema).min(2)
});

const ResearchEvidenceSchema = z.object({
    claim_index: z.number().int().nonnegative(),
    summary: z.string().min(1),
    artifact_paths: z.array(z.string()),
    contradicts_hypothesis: z.boolean(),
    evaluator_command: EvaluatorCommandSchema
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
    next_experiments: z.array(z.string())
});

export const VerifierResultSchema = z.object({
    verdict: z.enum(domainValues(VERIFIER_VERDICT)),
    claim_index: z.number().int().nonnegative(),
    result_statement: z.string().min(1),
    evaluator_command: EvaluatorCommandSchema,
    evidence_artifact_paths: z.array(z.string()),
    limitations: z.array(z.string()),
    known_counterexamples: z.array(z.string())
});

export type DirectorPlan = z.infer<typeof DirectorPlanSchema>;
export type ResearchResult = z.infer<typeof ResearchResultSchema>;
export type CriticResult = z.infer<typeof CriticResultSchema>;
export type VerifierResult = z.infer<typeof VerifierResultSchema>;

export function structuredOutputSchema(schema: z.ZodType): Readonly<Record<string, unknown>> {
    return z.toJSONSchema(schema, { target: "draft-7" }) as Readonly<Record<string, unknown>>;
}
