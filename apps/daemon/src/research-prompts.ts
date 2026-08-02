import type { TaskInput } from "@lab/protocol/schemas";
import type { FrozenEvaluator } from "#src/evaluator";
import type { CriticResult, DirectorPlan, ResearchResult } from "#src/research-contract";

export const SUBSCRIPTION_ONLY_POLICY =
    "Never invoke or install a model API, provider SDK, or model endpoint through curl, and never read API credentials; all model work must stay inside the current subscription-authenticated CLI session." as const;

export const MISSING_CAPABILITY_POLICY =
    "When a credential, tool, dataset, account, or infrastructure resource genuinely required for the mission is unavailable, report it in capability_requests with need, reason, and provisioning_hint, without including secret values. This is a concrete resource request, not permission to proceed. Continue every direction and check that remains possible. Available mission-specific external-service credentials may be used; model-provider API credentials and usage-based model billing remain forbidden." as const;

const RedactedPromptValue = {
    ARTIFACT_PATH: "[withheld-research-artifact]",
    EVALUATOR_PATH: "[daemon-frozen]"
} as const;

function taskContext(task: TaskInput): string {
    return JSON.stringify(
        {
            goal: task.goal,
            context: task.context,
            success_criteria: task.success_criteria
        },
        null,
        4
    );
}

export function directorPrompt(task: TaskInput): string {
    return `You are the Director of an autonomous research lab.

Turn the supplied goal into falsifiable claims and at least two genuinely independent research
directions whose approaches and objectives are materially distinct, not cosmetic rewrites. Do not
prescribe a solution method merely because it is familiar. Make every assumption explicit and give
it a concrete falsification test before outcome-bearing work. Consensus and model confidence are
not evidence.

${SUBSCRIPTION_ONLY_POLICY}

${MISSING_CAPABILITY_POLICY}

Task:
${taskContext(task)}

Return only the requested structured result.`;
}

export function evaluatorPrecommitPrompt(
    task: TaskInput,
    plan: DirectorPlan,
    direction: DirectorPlan["directions"][number]
): string {
    return `You are planning falsifiable evaluation before any outcome-bearing research begins.

${SUBSCRIPTION_ONLY_POLICY}

Create one or more evaluator executable files inside the current workspace for the claims or
assumptions this direction will test. Do not run the research, inspect outcomes, or emit a verdict.
Each evaluator must be a non-trivial executable regular file that reads the daemon JSON input from
stdin and emits exactly one JSON verdict matching the requested schema. It must evaluate the supplied
artifact files, echo their hashes and the daemon binding, implement the frozen success_contract, and
report at least one concrete check. A constant success script is invalid. Return contained evaluator
paths, immutable argv, target_kind, target_index, and an explicit success_contract.

Task:
${taskContext(task)}

Operational goal:
${plan.operational_goal}

Direction:
${JSON.stringify(direction, null, 4)}

Claims:
${JSON.stringify(plan.claims, null, 4)}

Assumptions:
${JSON.stringify(plan.assumptions, null, 4)}

Return only the requested structured precommit.`;
}

export function researcherPrompt(
    task: TaskInput,
    plan: DirectorPlan,
    direction: DirectorPlan["directions"][number],
    evaluators: readonly FrozenEvaluator[]
): string {
    return `You are an independent researcher. You have not received conclusions from other
research branches.

${SUBSCRIPTION_ONLY_POLICY}

${MISSING_CAPABILITY_POLICY}

Investigate the direction below as a read-only planner. Formulate a concrete hypothesis and return
one explicit execution_plan. Do not run commands, write files, edit the repository, or create outcome
artifacts yourself. The daemon alone executes the plan and records every attempt. The daemon has
already frozen the evaluators; do not edit, replace, or run them. Do not claim support based only on
your judgement.

Task:
${taskContext(task)}

Operational goal:
${plan.operational_goal}

Your isolated direction:
${JSON.stringify(direction, null, 4)}

Candidate claims and their precommitted evaluators:
${JSON.stringify(plan.claims, null, 4)}

Explicit assumptions and their precommitted falsification tests:
${JSON.stringify(plan.assumptions, null, 4)}

Daemon-frozen evaluators:
${JSON.stringify(
    evaluators.map((evaluator) => ({
        target_kind: evaluator.targetKind,
        target_index: evaluator.targetIndex,
        evaluator_sha256: evaluator.fileSha256,
        args: evaluator.args,
        success_contract: evaluator.successContract
    })),
    null,
    4
)}

Every evidence item must identify target_kind as claim or assumption and the corresponding zero-based
target_index. Actively test risky assumptions instead of treating them as background prose. Keep
artifact_paths empty: model-created paths and JSON are never empirical evidence. Instead declare every
expected relative artifact path in execution_plan.declared_output_paths. Use no shell indirection; file
and args are passed directly to the process. Classify external_effect accurately and include a stable
reconciliation_key when one exists. Do not return an evaluator command. The daemon will run the plan,
snapshot and re-hash declared outputs, then run only its frozen evaluator against those outputs.

Set capability_blocked to true only when this isolated direction cannot produce material evidence
until one of its reported capability_requests is provisioned. Keep it false when useful evidence is
available, even if an additional resource request remains open.

Return only the requested structured result.`;
}

export function criticPrompt(
    task: TaskInput,
    plan: DirectorPlan,
    results: readonly ResearchResult[]
): string {
    return `You are the adversarial critic. Try to falsify the research results, find hidden
assumptions, fabricated measurements, leakage, cherry-picking, evaluator bugs, and counterexamples.
Run additional checks in the current workspace when they are informative. Do not reward agreement
between agents.

${SUBSCRIPTION_ONLY_POLICY}

${MISSING_CAPABILITY_POLICY}

Task:
${taskContext(task)}

Precommitted claims and evaluators:
${JSON.stringify(plan.claims, null, 4)}

Explicit assumptions and falsification tests:
${JSON.stringify(plan.assumptions, null, 4)}

Branch reports:
${JSON.stringify(results, null, 4)}

Before independent reproduction starts, create an alternate non-trivial executable evaluator inside
this clean critic workspace. Return it as verification_evaluator with immutable argv, claim target,
and success_contract. It must read daemon JSON input from stdin and produce the required structured
verdict bound to the target and every artifact hash. It may not reuse a researcher evaluator.

Return only the requested structured result.`;
}

export function verifierPrompt(
    task: TaskInput,
    plan: DirectorPlan,
    results: readonly ResearchResult[],
    criticism: CriticResult
): string {
    const researchArtifactPaths = results.flatMap(({ evidence }) =>
        evidence.flatMap(({ artifact_paths }) => artifact_paths)
    );
    const branchReports = results.map((result) => ({
        ...result,
        evidence: result.evidence.map(({ artifact_paths, ...evidence }) => ({
            ...evidence,
            artifact_count: artifact_paths.length
        }))
    }));
    const redactedCriticism = {
        ...criticism,
        verification_evaluator: {
            ...criticism.verification_evaluator,
            evaluator_path: RedactedPromptValue.EVALUATOR_PATH
        }
    };
    const safeBranchReports = redactArtifactPaths(branchReports, researchArtifactPaths);
    const safeCriticism = redactArtifactPaths(redactedCriticism, researchArtifactPaths);
    return `You are an independent verifier in a clean session and workspace. Treat every supplied
claim as untrusted. Plan an independent reproduction of the strongest result from original inputs or
reconstructed artifacts and actively test the critic's concerns. Do not run commands or write files;
the daemon alone executes your structured execution_plan. An ordinary rerun of the researcher's
command is not independent reproduction.

${SUBSCRIPTION_ONLY_POLICY}

${MISSING_CAPABILITY_POLICY}

Task:
${taskContext(task)}

Claims and evaluators:
${JSON.stringify(plan.claims, null, 4)}

Branch reports (research artifact paths are deliberately withheld):
${JSON.stringify(safeBranchReports, null, 4)}

Adversarial review:
${JSON.stringify(safeCriticism, null, 4)}

Select the zero-based claim_index you will independently test. Keep evidence_artifact_paths empty:
model-created paths and JSON are never verifier evidence. Declare each relative output in
execution_plan.declared_output_paths and accurately classify external_effect. Do not create, select,
edit, or return an evaluator command. The daemon executes the plan, snapshots and re-hashes its
outputs, then runs the frozen critic-authored evaluator. A self-written claim that the evaluator
passed is not evidence.

Set capability_blocked to true only when independent reproduction cannot run until a reported
capability_request is provisioned. In that case return no execution_plan; the daemon will persist the
request and pause this verifier role without fabricating a command.

Return only the requested structured verdict.`;
}

function redactArtifactPaths(value: unknown, artifactPaths: readonly string[]): unknown {
    if (typeof value === "string") {
        return artifactPaths.reduce(
            (redacted, artifactPath) =>
                redacted.replaceAll(artifactPath, RedactedPromptValue.ARTIFACT_PATH),
            value
        );
    }
    if (Array.isArray(value)) {
        return value.map((item) => redactArtifactPaths(item, artifactPaths));
    }
    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
                key,
                redactArtifactPaths(item, artifactPaths)
            ])
        );
    }
    return value;
}
