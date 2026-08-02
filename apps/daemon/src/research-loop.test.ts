import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { WakeTrigger } from "@lab/core/constants";
import {
    type AgentHarness,
    HarnessAuthenticationMethods,
    type HarnessEvent,
    HarnessEventTypes,
    HarnessExecutionProfiles,
    HarnessInputSources,
    HarnessKinds,
    type HarnessPreflight,
    type HarnessRunRequest,
    type HarnessRunResult,
    HarnessRunStatuses,
    HarnessTimeoutMilliseconds
} from "@lab/harness/contract";
import { HarnessCapabilityError } from "@lab/harness/errors";
import {
    AgentRole,
    AgentStatus,
    BranchStatus,
    CapabilityStatus,
    ClaimStatus,
    EventType,
    EvidenceKind,
    ExperimentStatus,
    ExternalEffect,
    InternalTaskStatus,
    LabState
} from "@lab/protocol/constants";
import { describe, expect, it } from "vitest";
import {
    CRITIC_VERDICT,
    EVALUATOR_VERDICT,
    RESEARCH_OUTCOME,
    RESEARCH_TARGET_KIND,
    VERIFIER_VERDICT
} from "#src/research-contract";
import { initialResearchIdentifiers } from "#src/research-identifiers";
import { ResearchLoopOutcomeStatus, runResearchLoop } from "#src/research-loop";
import { ResearchStage } from "#src/research-workspace";
import { LabWorkspace } from "#src/workspace";

const PromptRole = {
    DIRECTOR: "Director of an autonomous research lab",
    EVALUATOR_PRECOMMIT: "planning falsifiable evaluation",
    RESEARCHER: "independent researcher",
    CRITIC: "adversarial critic",
    VERIFIER: "independent verifier"
} as const;

const EvaluatorComparison = {
    LESS_THAN: "less_than",
    TRUTHY: "truthy"
} as const;

const CapabilityFixture = {
    NEED: "An active local product-subscription CLI session",
    REASON: "The previously authenticated subscription session became unavailable",
    PROVISIONING_HINT: "Restore the interactive subscription login and retry",
    RESOURCE_REFERENCE: "toolchain://codex/subscription-session",
    CONTEXT_TYPE: "provided_capability"
} as const;

const DatasetCapabilityFixture = {
    NEED: "Held-out production-shaped benchmark dataset",
    REASON: "The indexing direction cannot validate representativeness without the dataset",
    PROVISIONING_HINT: "Attach a read-only dataset snapshot to the research workspace",
    DIRECTION_TITLE: "Indexing"
} as const;

const RecoveryContextFixture = {
    KNOWN: "The persisted baseline uses a B-tree index",
    OPEN_QUESTION: "Does batching preserve tail latency?",
    BLOCKER: "A previous branch could not access held-out traffic",
    NEXT_EXPERIMENT: "Benchmark a production-shaped workload",
    CLAIM_ID: "claim-recovered-open",
    CLAIM_STATEMENT: "Batching may reduce median latency",
    CAPABILITY_NEED: "Recovered production-shaped dataset",
    CAPABILITY_REASON: "The recovered frontier references held-out traffic",
    CAPABILITY_HINT: "Attach the persisted dataset snapshot",
    RESOURCE_REFERENCE: "dataset://recovered/production-v1"
} as const;

const DormantCapabilityFixture = {
    DIRECTION_TITLE: "Repair orchestration recovery",
    DIRECTION_APPROACH: "Rewrite the research lab orchestrator recovery path",
    DIRECTION_RATIONALE: "The control plane may be losing recovered tasks",
    DIRECTION_OBJECTIVE: "Patch the research-loop scheduler and measure restored dispatch",
    BLOCKER: "The research lab orchestrator crashes while restoring queued tasks"
} as const;

class ScriptedHarness implements AgentHarness {
    readonly kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE;
    readonly requests: HarnessRunRequest[] = [];
    readonly researcherInitialEntries: string[][] = [];
    readonly verifierInitialEntries: string[][] = [];
    readonly #criticVerdict: (typeof CRITIC_VERDICT)[keyof typeof CRITIC_VERDICT];
    readonly #falsifyAssumption: boolean;
    readonly #missingVerifierArtifacts: boolean;
    readonly #mutateEvaluatorAfterOutcome: boolean;
    readonly #trivialEvaluator: boolean;
    readonly #requestDatasetForIndexing: boolean;
    readonly #disguisedConstantEvaluator: boolean;
    readonly #precommitOutcomeOnly: boolean;
    readonly #copiedVerifierArtifact: boolean;
    readonly #trivialCriticEvaluator: boolean;
    readonly #cosmeticCriticEvaluator: boolean;
    readonly #blockingVerifierEvaluator: boolean;
    readonly #irreversibleOutcomeTimeout: boolean;
    readonly #forbiddenOutcomeCommands: boolean;
    readonly #fabricatedVerifierArtifactPath: boolean;
    readonly #mutateOutcomeDuringEvaluation: boolean;
    readonly #inspectOutcomeEnvironment: boolean;
    readonly #requestVerifierCapability: boolean;
    readonly #protectedControlPlaneDirection: boolean;
    readonly #researchEvaluatorPaths: string[] = [];
    readonly #precomputedArtifactPaths: string[] = [];

    constructor(
        kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE,
        options: {
            criticVerdict?: (typeof CRITIC_VERDICT)[keyof typeof CRITIC_VERDICT];
            falsifyAssumption?: boolean;
            missingVerifierArtifacts?: boolean;
            mutateEvaluatorAfterOutcome?: boolean;
            trivialEvaluator?: boolean;
            requestDatasetForIndexing?: boolean;
            disguisedConstantEvaluator?: boolean;
            precommitOutcomeOnly?: boolean;
            copiedVerifierArtifact?: boolean;
            trivialCriticEvaluator?: boolean;
            cosmeticCriticEvaluator?: boolean;
            blockingVerifierEvaluator?: boolean;
            irreversibleOutcomeTimeout?: boolean;
            forbiddenOutcomeCommands?: boolean;
            fabricatedVerifierArtifactPath?: boolean;
            mutateOutcomeDuringEvaluation?: boolean;
            inspectOutcomeEnvironment?: boolean;
            requestVerifierCapability?: boolean;
            protectedControlPlaneDirection?: boolean;
        } = {}
    ) {
        this.kind = kind;
        this.#criticVerdict = options.criticVerdict ?? CRITIC_VERDICT.CREDIBLE;
        this.#falsifyAssumption = options.falsifyAssumption ?? false;
        this.#missingVerifierArtifacts = options.missingVerifierArtifacts ?? false;
        this.#mutateEvaluatorAfterOutcome = options.mutateEvaluatorAfterOutcome ?? false;
        this.#trivialEvaluator = options.trivialEvaluator ?? false;
        this.#requestDatasetForIndexing = options.requestDatasetForIndexing ?? false;
        this.#disguisedConstantEvaluator = options.disguisedConstantEvaluator ?? false;
        this.#precommitOutcomeOnly = options.precommitOutcomeOnly ?? false;
        this.#copiedVerifierArtifact = options.copiedVerifierArtifact ?? false;
        this.#trivialCriticEvaluator = options.trivialCriticEvaluator ?? false;
        this.#cosmeticCriticEvaluator = options.cosmeticCriticEvaluator ?? false;
        this.#blockingVerifierEvaluator = options.blockingVerifierEvaluator ?? false;
        this.#irreversibleOutcomeTimeout = options.irreversibleOutcomeTimeout ?? false;
        this.#forbiddenOutcomeCommands = options.forbiddenOutcomeCommands ?? false;
        this.#fabricatedVerifierArtifactPath = options.fabricatedVerifierArtifactPath ?? false;
        this.#mutateOutcomeDuringEvaluation = options.mutateOutcomeDuringEvaluation ?? false;
        this.#inspectOutcomeEnvironment = options.inspectOutcomeEnvironment ?? false;
        this.#requestVerifierCapability = options.requestVerifierCapability ?? false;
        this.#protectedControlPlaneDirection = options.protectedControlPlaneDirection ?? false;
    }

    async preflight(): Promise<HarnessPreflight> {
        return preflight(this.kind);
    }

    async *run(request: HarnessRunRequest): AsyncIterable<HarnessEvent> {
        this.requests.push(request);
        let output: unknown;
        if (request.prompt.includes(PromptRole.DIRECTOR)) {
            output = {
                operational_goal: "Measure and independently reproduce a speedup",
                assumptions: this.#falsifyAssumption
                    ? [
                          {
                              statement: "The benchmark workload represents production traffic",
                              reason: "The result is intended for production",
                              risk: "A biased workload can reverse the result",
                              falsification_test: "Evaluate a held-out production-shaped workload"
                          }
                      ]
                    : [],
                claims: [
                    {
                        statement: "The candidate is faster",
                        evaluator: "Compare elapsed time",
                        success_condition: "Candidate median is lower"
                    }
                ],
                directions: [
                    this.#protectedControlPlaneDirection
                        ? {
                              title: DormantCapabilityFixture.DIRECTION_TITLE,
                              approach: DormantCapabilityFixture.DIRECTION_APPROACH,
                              rationale: DormantCapabilityFixture.DIRECTION_RATIONALE,
                              objective: DormantCapabilityFixture.DIRECTION_OBJECTIVE
                          }
                        : {
                              title: "Indexing",
                              approach: "Change the lookup index",
                              rationale: "Lookup dominates runtime",
                              objective: "Measure indexed lookup"
                          },
                    {
                        title: "Batching",
                        approach: "Batch independent operations",
                        rationale: "Operations are independent",
                        objective: "Measure batched execution"
                    }
                ]
            };
        } else if (request.prompt.includes(PromptRole.EVALUATOR_PRECOMMIT)) {
            const evaluatorPath = path.join(request.cwd, "evaluate-research");
            this.#researchEvaluatorPaths.push(evaluatorPath);
            const targetKind = this.#falsifyAssumption
                ? RESEARCH_TARGET_KIND.ASSUMPTION
                : RESEARCH_TARGET_KIND.CLAIM;
            const successContract = this.#falsifyAssumption
                ? "The held-out workload must be representative"
                : "Measured elapsed_ms must be below 20";
            const evaluatorSource = this.#trivialEvaluator
                ? "#!/usr/bin/env node\nprocess.exit(0);\n"
                : this.#disguisedConstantEvaluator
                  ? constantSupportingEvaluatorProgram()
                  : evaluatorProgram({
                        field: this.#falsifyAssumption ? "representative" : "elapsed_ms",
                        expected: this.#falsifyAssumption ? "true" : "20",
                        successContract,
                        supportsWhen: this.#falsifyAssumption
                            ? EvaluatorComparison.TRUTHY
                            : EvaluatorComparison.LESS_THAN,
                        mutateArtifact: this.#mutateOutcomeDuringEvaluation
                    });
            await writeFile(evaluatorPath, evaluatorSource);
            await chmod(evaluatorPath, 0o755);
            if (this.#precommitOutcomeOnly) {
                const precomputedArtifactPath = path.join(request.cwd, "precomputed-result.json");
                await writeFile(precomputedArtifactPath, JSON.stringify({ elapsed_ms: 12 }));
                this.#precomputedArtifactPaths.push(precomputedArtifactPath);
            }
            output = {
                evaluators: [
                    {
                        target_kind: targetKind,
                        target_index: 0,
                        evaluator_path: evaluatorPath,
                        args: ["--structured"],
                        success_contract: successContract
                    }
                ]
            };
        } else if (request.prompt.includes(PromptRole.RESEARCHER)) {
            this.researcherInitialEntries.push(await readdir(request.cwd));
            const datasetBlocked =
                this.#requestDatasetForIndexing &&
                request.prompt.includes(`"title": "${DatasetCapabilityFixture.DIRECTION_TITLE}"`);
            if (this.#mutateEvaluatorAfterOutcome) {
                const frozenEvaluatorPath = this.#researchEvaluatorPaths.shift();
                if (frozenEvaluatorPath !== undefined) {
                    await writeFile(frozenEvaluatorPath, "#!/usr/bin/env node\nprocess.exit(0);\n");
                }
            } else {
                this.#researchEvaluatorPaths.shift();
            }
            if (datasetBlocked) {
                const capabilityRequest = {
                    need: DatasetCapabilityFixture.NEED,
                    reason: DatasetCapabilityFixture.REASON,
                    provisioning_hint: DatasetCapabilityFixture.PROVISIONING_HINT
                };
                output = {
                    summary: "The indexing direction needs a held-out dataset",
                    hypothesis: "Indexing may lower elapsed time on production-shaped traffic",
                    outcome: RESEARCH_OUTCOME.INCONCLUSIVE,
                    evidence: [],
                    limitations: [DatasetCapabilityFixture.NEED],
                    next_experiments: [],
                    capability_requests: [capabilityRequest, capabilityRequest],
                    capability_blocked: true
                };
            } else {
                const artifactPath = this.#precommitOutcomeOnly
                    ? (this.#precomputedArtifactPaths.shift() ?? "missing-precomputed-artifact")
                    : path.join(
                          request.cwd,
                          this.#irreversibleOutcomeTimeout
                              ? "irreversible-result.json"
                              : `measurement-${this.requests.length}.json`
                      );
                const outputContent = JSON.stringify(
                    this.#falsifyAssumption ? { representative: false } : { elapsed_ms: 12 }
                );
                const outputExpression = this.#inspectOutcomeEnvironment
                    ? `JSON.stringify({ elapsed_ms: 12, outcome_env: { home: process.env.HOME, codex_home: process.env.CODEX_HOME, claude_config_dir: process.env.CLAUDE_CONFIG_DIR, provider_api_keys_absent: [["OPENAI", "API", "KEY"], ["ANTHROPIC", "API", "KEY"], [["CO", "DEX"].join(""), "API", "KEY"]].map((parts) => parts.join("_")).every((name) => process.env[name] === undefined), auth_marker_visible: await (async () => { try { await (await import("node:fs/promises")).access((await import("node:path")).join(process.env.CODEX_HOME, "auth-marker")); return true; } catch { return false; } })() } })`
                    : JSON.stringify(outputContent);
                output = {
                    summary: "A recorded benchmark supports the claim",
                    hypothesis: "The candidate lowers elapsed time",
                    outcome: this.#falsifyAssumption
                        ? RESEARCH_OUTCOME.REFUTED
                        : RESEARCH_OUTCOME.SUPPORTED,
                    evidence: [
                        {
                            target_kind: this.#falsifyAssumption
                                ? RESEARCH_TARGET_KIND.ASSUMPTION
                                : RESEARCH_TARGET_KIND.CLAIM,
                            target_index: 0,
                            summary: "Recorded benchmark samples",
                            artifact_paths: this.#precommitOutcomeOnly ? [artifactPath] : [],
                            contradicts_hypothesis: this.#falsifyAssumption
                        }
                    ],
                    execution_plan: {
                        file: this.#forbiddenOutcomeCommands
                            ? request.prompt.includes(
                                  `"title": "${DatasetCapabilityFixture.DIRECTION_TITLE}"`
                              )
                                ? "curl"
                                : "codex"
                            : process.execPath,
                        args: this.#forbiddenOutcomeCommands
                            ? request.prompt.includes(
                                  `"title": "${DatasetCapabilityFixture.DIRECTION_TITLE}"`
                              )
                                ? ["https://api.openai.com/v1/models"]
                                : ["exec", "-"]
                            : [
                                  "--input-type=module",
                                  "-e",
                                  this.#irreversibleOutcomeTimeout
                                      ? `await (await import("node:fs/promises")).writeFile(${JSON.stringify(path.basename(artifactPath))}, ${outputExpression}); await new Promise((resolve) => setTimeout(resolve, 10_000))`
                                      : `await (await import("node:fs/promises")).writeFile(${JSON.stringify(path.basename(artifactPath))}, ${outputExpression})`
                              ],
                        declared_output_paths: [path.basename(artifactPath)],
                        timeout_ms: this.#irreversibleOutcomeTimeout ? 50 : 300_000,
                        external_effect: this.#irreversibleOutcomeTimeout
                            ? ExternalEffect.IRREVERSIBLE
                            : ExternalEffect.NONE,
                        ...(this.#irreversibleOutcomeTimeout
                            ? { reconciliation_key: "irreversible-operation" }
                            : {})
                    },
                    limitations: [],
                    next_experiments: []
                };
            }
        } else if (request.prompt.includes(PromptRole.CRITIC)) {
            const evaluatorPath = path.join(request.cwd, "verify-independent");
            const successContract = this.#cosmeticCriticEvaluator
                ? "Measured elapsed_ms must be below 20"
                : "Independent elapsed_ms must be below 15";
            const evaluatorSource = this.#trivialCriticEvaluator
                ? "#!/usr/bin/env node\nprocess.exit(0);\n"
                : this.#cosmeticCriticEvaluator
                  ? `${evaluatorProgram({
                        field: "elapsed_ms",
                        expected: "20",
                        successContract,
                        supportsWhen: EvaluatorComparison.LESS_THAN
                    })}\n// Cosmetic critic-only comment\n`
                  : this.#blockingVerifierEvaluator
                    ? evaluatorProgram({
                          field: "elapsed_ms",
                          expected: "15",
                          successContract,
                          supportsWhen: EvaluatorComparison.LESS_THAN,
                          delayMs: 10_000
                      })
                    : evaluatorProgram({
                          field: "elapsed_ms",
                          expected: "15",
                          successContract,
                          supportsWhen: EvaluatorComparison.LESS_THAN
                      });
            await writeFile(evaluatorPath, evaluatorSource);
            await chmod(evaluatorPath, 0o755);
            output = {
                verdict: this.#criticVerdict,
                summary: "The result is ready for independent reproduction",
                issues:
                    this.#criticVerdict === CRITIC_VERDICT.CREDIBLE
                        ? []
                        : ["The evaluator may be overfit"],
                counterexamples:
                    this.#criticVerdict === CRITIC_VERDICT.CREDIBLE
                        ? []
                        : ["A held-out workload did not improve"],
                claims_to_verify: ["The candidate is faster"],
                next_experiments: [],
                verification_evaluator: {
                    target_kind: RESEARCH_TARGET_KIND.CLAIM,
                    target_index: 0,
                    evaluator_path: evaluatorPath,
                    args: [this.#cosmeticCriticEvaluator ? "--structured" : "--independent"],
                    success_contract: successContract
                }
            };
        } else if (request.prompt.includes(PromptRole.VERIFIER)) {
            this.verifierInitialEntries.push(await readdir(request.cwd));
            if (this.#requestVerifierCapability) {
                output = {
                    verdict: VERIFIER_VERDICT.INCONCLUSIVE,
                    claim_index: 0,
                    result_statement: "Independent reproduction requires held-out input",
                    evidence_artifact_paths: [],
                    limitations: [DatasetCapabilityFixture.NEED],
                    known_counterexamples: [],
                    capability_requests: [
                        {
                            need: DatasetCapabilityFixture.NEED,
                            reason: DatasetCapabilityFixture.REASON,
                            provisioning_hint: DatasetCapabilityFixture.PROVISIONING_HINT
                        }
                    ],
                    capability_blocked: true
                };
                const result = await harnessResult(this.kind, request, output);
                yield {
                    type: HarnessEventTypes.RUN_COMPLETED,
                    sequence: 1,
                    occurredAt: new Date().toISOString(),
                    harness: this.kind,
                    sessionId: result.sessionId,
                    result
                };
                return;
            }
            const artifactPath = path.join(request.cwd, "independent-reproduction.json");
            if (this.#fabricatedVerifierArtifactPath) {
                await writeFile(
                    artifactPath,
                    JSON.stringify({ elapsed_ms: this.#copiedVerifierArtifact ? 12 : 11 })
                );
            }
            output = {
                verdict: VERIFIER_VERDICT.REPRODUCED,
                claim_index: 0,
                result_statement: "An independent benchmark reproduced the speedup",
                evidence_artifact_paths: this.#fabricatedVerifierArtifactPath ? [artifactPath] : [],
                execution_plan: {
                    file: process.execPath,
                    args: this.#missingVerifierArtifacts
                        ? ["-e", "process.exit(0)"]
                        : [
                              "--input-type=module",
                              "-e",
                              `await (await import("node:fs/promises")).writeFile("independent-reproduction.json", ${JSON.stringify(JSON.stringify({ elapsed_ms: this.#copiedVerifierArtifact ? 12 : 11 }))})`
                          ],
                    declared_output_paths: ["independent-reproduction.json"],
                    external_effect: ExternalEffect.NONE
                },
                limitations: [],
                known_counterexamples: []
            };
        } else {
            throw new Error("Unexpected test prompt");
        }

        const result = await harnessResult(this.kind, request, output);
        yield {
            type: HarnessEventTypes.RUN_COMPLETED,
            sequence: 1,
            occurredAt: new Date().toISOString(),
            harness: this.kind,
            sessionId: result.sessionId,
            result
        };
    }
}

class FailingOnceHarness extends ScriptedHarness {
    readonly #promptMarker: string;
    readonly #status: HarnessRunResult["status"];
    #failed = false;

    constructor(
        kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE,
        promptMarker: string,
        status: HarnessRunResult["status"] = HarnessRunStatuses.FAILED
    ) {
        super(kind);
        this.#promptMarker = promptMarker;
        this.#status = status;
    }

    override async *run(request: HarnessRunRequest): AsyncIterable<HarnessEvent> {
        if (!this.#failed && request.prompt.includes(this.#promptMarker)) {
            this.#failed = true;
            this.requests.push(request);
            const result = await harnessResult(this.kind, request, undefined, this.#status);
            yield {
                type: HarnessEventTypes.RUN_COMPLETED,
                sequence: 1,
                occurredAt: new Date().toISOString(),
                harness: this.kind,
                sessionId: result.sessionId,
                result
            };
            return;
        }
        yield* super.run(request);
    }
}

class UnavailableHarness implements AgentHarness {
    readonly kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE;
    preflightCalls = 0;

    constructor(kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE) {
        this.kind = kind;
    }

    preflight(): Promise<HarnessPreflight> {
        this.preflightCalls += 1;
        throw new HarnessCapabilityError(this.kind, "Subscription login is unavailable", {
            need: `${this.kind} subscription login`,
            reason: "The authenticated product subscription is unavailable",
            provisioningHint: `Log in to ${this.kind} interactively`
        });
    }

    run(): AsyncIterable<HarnessEvent> {
        throw new Error("Unavailable harness must never run");
    }
}

class CapabilityLossHarness extends ScriptedHarness {
    readonly #promptMarker: string;

    constructor(
        kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE,
        promptMarker: string
    ) {
        super(kind);
        this.#promptMarker = promptMarker;
    }

    override async *run(request: HarnessRunRequest): AsyncIterable<HarnessEvent> {
        if (request.prompt.includes(this.#promptMarker)) {
            this.requests.push(request);
            throw new HarnessCapabilityError(
                this.kind,
                "Subscription capability disappeared after preflight",
                {
                    need: CapabilityFixture.NEED,
                    reason: CapabilityFixture.REASON,
                    provisioningHint: CapabilityFixture.PROVISIONING_HINT
                }
            );
        }
        yield* super.run(request);
    }
}

class BlockingHarness implements AgentHarness {
    readonly kind: typeof HarnessKinds.CODEX;
    readonly started: Promise<void>;
    #markStarted: () => void = () => undefined;

    constructor(kind: typeof HarnessKinds.CODEX) {
        this.kind = kind;
        this.started = new Promise((resolve) => {
            this.#markStarted = resolve;
        });
    }

    async preflight(): Promise<HarnessPreflight> {
        return preflight(this.kind);
    }

    async *run(_request: HarnessRunRequest, signal?: AbortSignal): AsyncIterable<HarnessEvent> {
        this.#markStarted();
        await new Promise<void>((_resolve, reject) => {
            signal?.addEventListener(
                "abort",
                () => reject(signal.reason ?? new Error("cancelled")),
                { once: true }
            );
        });
    }
}

class BlockingPreflightHarness implements AgentHarness {
    readonly kind = HarnessKinds.CODEX;
    readonly started: Promise<void>;
    #markStarted: () => void = () => undefined;

    constructor() {
        this.started = new Promise((resolve) => {
            this.#markStarted = resolve;
        });
    }

    async preflight(signal?: AbortSignal): Promise<HarnessPreflight> {
        this.#markStarted();
        await new Promise<void>((_resolve, reject) => {
            signal?.addEventListener(
                "abort",
                () => reject(signal.reason ?? new Error("cancelled")),
                { once: true }
            );
        });
        throw new Error("Unexpected preflight continuation");
    }

    run(): AsyncIterable<HarnessEvent> {
        throw new Error("Cancelled preflight harness must never run");
    }
}

describe.sequential("runResearchLoop", () => {
    it("completes only after material branch evidence and a clean independent reproduction", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX);
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE);

        const outcome = await runResearchLoop(workspace, { harnesses: [codex, claude] });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.COMPLETED);
        expect(workspace.getSnapshot().lab.state).toBe(LabState.COMPLETED);
        expect(workspace.getSnapshot().claims).toEqual([
            expect.objectContaining({ status: ClaimStatus.REPRODUCED })
        ]);
        expect(workspace.getSnapshot().experiments).toHaveLength(11);
        expect(
            workspace
                .getSnapshot()
                .experiments.every(({ status }) => status === ExperimentStatus.SUCCEEDED)
        ).toBe(true);
        expect(workspace.getEvidence().some(({ kind }) => kind === EvidenceKind.ARTIFACT)).toBe(
            true
        );
        expect(
            workspace
                .getEvidence()
                .filter(({ kind }) => kind === EvidenceKind.ARTIFACT)
                .every(({ supports }) => supports)
        ).toBe(true);
        expect(
            workspace.getEvidence().some(({ kind }) => kind === EvidenceKind.VERIFIER_RESULT)
        ).toBe(true);
        expect([...codex.requests, ...claude.requests]).toHaveLength(7);
        const criticRequest = [...codex.requests, ...claude.requests].find(({ prompt }) =>
            prompt.includes(PromptRole.CRITIC)
        );
        expect(criticRequest?.prompt).toMatch(/"artifact_paths": \[\s+"\//);
        const runDirectories = new Set(
            [...codex.requests, ...claude.requests].map(({ cwd }) => cwd)
        );
        expect(runDirectories.size).toBe(7);
        expect([...codex.researcherInitialEntries, ...claude.researcherInitialEntries]).toEqual([
            [".git"],
            [".git"]
        ]);
        expect([...codex.verifierInitialEntries, ...claude.verifierInitialEntries]).toEqual([
            [".git"]
        ]);
        const verifierRequest = [...codex.requests, ...claude.requests].find(({ prompt }) =>
            prompt.includes(PromptRole.VERIFIER)
        );
        expect(verifierRequest?.executionProfile).toBe(HarnessExecutionProfiles.READ_ONLY);
        expect(verifierRequest?.prompt).not.toContain('"artifact_paths"');
        for (const request of [...codex.requests, ...claude.requests].filter(({ prompt }) =>
            prompt.includes(PromptRole.RESEARCHER)
        )) {
            expect(request.executionProfile).toBe(HarnessExecutionProfiles.READ_ONLY);
            expect(verifierRequest?.prompt).not.toContain(request.cwd);
        }
        expect(workspace.getSnapshot().experiments).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    evaluator: "Daemon-owned outcome executor",
                    external_effect: ExternalEffect.NONE,
                    output_hash: expect.stringMatching(/^[a-f\d]{64}$/u)
                })
            ])
        );
        expect(workspace.getEvents().map(({ type }) => type)).toEqual(
            expect.arrayContaining([
                EventType.HARNESS_PREFLIGHT_SUCCEEDED,
                EventType.EVALUATOR_PRECOMMITTED,
                EventType.CLAIM_SUPPORTED,
                EventType.VERIFIER_VERDICT_RECORDED,
                EventType.CLAIM_REPRODUCED,
                EventType.LAB_COMPLETED
            ])
        );
        const evaluatorPrecommits = workspace
            .getEvents()
            .filter(({ type }) => type === EventType.EVALUATOR_PRECOMMITTED);
        expect(evaluatorPrecommits).toHaveLength(3);
        expect(evaluatorPrecommits).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    payload: expect.objectContaining({
                        evaluator_sha256: expect.stringMatching(/^[a-f\d]{64}$/),
                        evaluator_semantic_identity_sha256: expect.stringMatching(/^[a-f\d]{64}$/),
                        success_contract: expect.any(String)
                    })
                })
            ])
        );
        await expect(
            readFile(path.join(workspace.runDirectory, "result.json"), "utf8")
        ).resolves.toContain("independent benchmark reproduced");
    });

    it("falls back when a director omits required operational assumptions", async () => {
        const workspace = await createWorkspace({
            goal: "Find and independently reproduce a speedup",
            context: [],
            success_criteria: []
        });
        const codex = new ScriptedHarness(HarnessKinds.CODEX);
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            falsifyAssumption: true
        });
        const abortController = new AbortController();
        const running = runResearchLoop(workspace, {
            harnesses: [codex, claude],
            signal: abortController.signal
        });
        await waitUntil(() =>
            workspace
                .getSnapshot()
                .claims.some(
                    ({ statement }) =>
                        statement === "The benchmark workload represents production traffic"
                )
        );

        abortController.abort(new Error("director fallback observed"));
        const outcome = await running;

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.CANCELLED);
        expect(codex.requests.some(({ prompt }) => prompt.includes(PromptRole.DIRECTOR))).toBe(
            true
        );
        expect(claude.requests.some(({ prompt }) => prompt.includes(PromptRole.DIRECTOR))).toBe(
            true
        );
        expect(workspace.getEvents().map(({ type }) => type)).toContain(
            EventType.GOAL_OPERATIONALIZED
        );
        expect(workspace.getSnapshot().claims).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    statement: "The benchmark workload represents production traffic"
                })
            ])
        );
    });

    it("rejects an undiagnosed lab-control-plane direction before creating its task or branch", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            protectedControlPlaneDirection: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE);

        const outcome = await runResearchLoop(workspace, { harnesses: [codex, claude] });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.COMPLETED);
        expect(
            codex.requests.filter(({ prompt }) => prompt.includes(PromptRole.DIRECTOR))
        ).toHaveLength(1);
        expect(
            claude.requests.filter(({ prompt }) => prompt.includes(PromptRole.DIRECTOR))
        ).toHaveLength(1);
        const snapshot = workspace.getSnapshot();
        expect(snapshot.branches).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    title: DormantCapabilityFixture.DIRECTION_TITLE,
                    approach: DormantCapabilityFixture.DIRECTION_APPROACH
                })
            ])
        );
        expect(snapshot.tasks).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    objective: DormantCapabilityFixture.DIRECTION_OBJECTIVE
                })
            ])
        );
    });

    it("allows a matching repair direction only after recovering its diagnosed blocker", async () => {
        const workspace = await createWorkspace();
        await workspace.update((draft) => {
            draft.frontier.blockers.push(DormantCapabilityFixture.BLOCKER);
        });
        const workspaceRoot = path.dirname(path.dirname(workspace.runDirectory));
        const recovered = await LabWorkspace.load(workspaceRoot, workspace.runDirectory);
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            protectedControlPlaneDirection: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            protectedControlPlaneDirection: true
        });

        const outcome = await runResearchLoop(recovered, { harnesses: [codex, claude] });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.COMPLETED);
        expect(recovered.getSnapshot().branches).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    title: DormantCapabilityFixture.DIRECTION_TITLE,
                    approach: DormantCapabilityFixture.DIRECTION_APPROACH
                })
            ])
        );
        expect(recovered.getSnapshot().tasks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    objective: DormantCapabilityFixture.DIRECTION_OBJECTIVE,
                    role: AgentRole.RESEARCHER
                })
            ])
        );
    });

    it("persists a blocked researcher resource request while another branch completes", async () => {
        const workspace = await createWorkspace();
        const harness = new ScriptedHarness(HarnessKinds.CODEX, {
            requestDatasetForIndexing: true
        });

        const outcome = await runResearchLoop(workspace, { harnesses: [harness] });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.COMPLETED);
        const snapshot = workspace.getSnapshot();
        expect(snapshot.lab.state).toBe(LabState.COMPLETED);
        expect(snapshot.claims).toEqual([
            expect.objectContaining({ status: ClaimStatus.REPRODUCED })
        ]);
        expect(snapshot.capability_requests).toEqual([
            expect.objectContaining({
                need: DatasetCapabilityFixture.NEED,
                reason: DatasetCapabilityFixture.REASON,
                provisioning_hint: DatasetCapabilityFixture.PROVISIONING_HINT,
                status: CapabilityStatus.OPEN
            })
        ]);
        const capabilityRequest = snapshot.capability_requests[0];
        if (capabilityRequest === undefined) {
            throw new Error("Expected a persisted dataset capability request");
        }
        const blockedBranch = snapshot.branches.find(
            ({ title }) => title === DatasetCapabilityFixture.DIRECTION_TITLE
        );
        if (blockedBranch === undefined) {
            throw new Error("Expected the resource-blocked research branch");
        }
        expect(blockedBranch.status).toBe(BranchStatus.PAUSED);
        expect(
            snapshot.agents.find(({ branch_id }) => branch_id === blockedBranch.id)
        ).toMatchObject({
            status: AgentStatus.BLOCKED,
            current_task_id: expect.any(String)
        });
        expect(
            snapshot.tasks.find(({ branch_id }) => branch_id === blockedBranch.id)
        ).toMatchObject({
            status: InternalTaskStatus.QUEUED,
            context_refs: [capabilityRequest.id]
        });
        expect(
            workspace.getEvents().filter(({ type }) => type === EventType.CAPABILITY_REQUESTED)
        ).toHaveLength(1);
    });

    it("rejects a researcher that replaces its evaluator after the precommit", async () => {
        const workspace = await createWorkspace();
        const abortController = new AbortController();
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            mutateEvaluatorAfterOutcome: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            mutateEvaluatorAfterOutcome: true
        });

        const outcome = await runResearchLoop(workspace, {
            harnesses: [codex, claude],
            signal: abortController.signal,
            plateauInactivityMs: 1,
            waitForPlateau: async () => {
                const reason = new Error("Evaluator mutation observed");
                abortController.abort(reason);
                throw reason;
            }
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        const claimStatuses = workspace.getSnapshot().claims.map(({ status }) => status);
        expect(claimStatuses).not.toContain(ClaimStatus.SUPPORTED);
        expect(claimStatuses).not.toContain(ClaimStatus.REPRODUCED);
        expect(workspace.getSnapshot().experiments).toEqual(
            expect.arrayContaining([expect.objectContaining({ status: ExperimentStatus.FAILED })])
        );
        expect(workspace.getEvents().map(({ type }) => type)).not.toContain(
            EventType.LAB_COMPLETED
        );
    });

    it("rejects an evaluator that mutates an immutable outcome snapshot", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            mutateOutcomeDuringEvaluation: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            mutateOutcomeDuringEvaluation: true
        });

        const outcome = await runResearchLoop(workspace, {
            harnesses: [codex, claude],
            plateauInactivityMs: 1
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        expect(workspace.getEvidence()).toHaveLength(0);
        expect(workspace.getSnapshot().frontier.blockers).toEqual(
            expect.arrayContaining([expect.stringContaining("changed across evaluator boundary")])
        );
    });

    it("rejects verifier artifacts copied byte-for-byte from a research branch", async () => {
        const workspace = await createWorkspace();
        const abortController = new AbortController();
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            copiedVerifierArtifact: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE);

        const outcome = await runResearchLoop(workspace, {
            harnesses: [codex, claude],
            signal: abortController.signal,
            waitForCycle: async () => abortController.abort(new Error("test cycle observed"))
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.CANCELLED);
        expect(workspace.getSnapshot().claims.map(({ status }) => status)).not.toContain(
            ClaimStatus.REPRODUCED
        );
        expect(workspace.getSnapshot().frontier.blockers).toEqual(
            expect.arrayContaining([expect.stringContaining("copied from a research branch")])
        );
        expect(
            workspace.getSnapshot().tasks.find(({ role }) => role === AgentRole.VERIFIER)?.status
        ).toBe(InternalTaskStatus.FAILED);
    });

    it("propagates cancellation from the frozen verifier evaluator and cancels its role", async () => {
        const workspace = await createWorkspace();
        const abortController = new AbortController();
        const codex = new ScriptedHarness(HarnessKinds.CODEX);
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            blockingVerifierEvaluator: true
        });
        const running = runResearchLoop(workspace, {
            harnesses: [codex, claude],
            signal: abortController.signal
        });
        await waitUntil(() =>
            workspace
                .getSnapshot()
                .experiments.some(
                    ({ evaluator, status }) =>
                        evaluator === "Daemon-attested independent evaluator" &&
                        status === ExperimentStatus.RUNNING
                )
        );

        abortController.abort(new Error("cancel frozen verifier evaluator"));
        const outcome = await running;

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.CANCELLED);
        expect(
            workspace.getSnapshot().tasks.find(({ role }) => role === AgentRole.VERIFIER)?.status
        ).toBe(InternalTaskStatus.CANCELLED);
        expect(workspace.getEvents().map(({ type }) => type)).toEqual(
            expect.arrayContaining([
                EventType.EXPERIMENT_CANCELLED,
                EventType.ATTEMPT_CANCELLED,
                EventType.TASK_CANCELLED
            ])
        );
    });

    it("rejects a disguised constant-success evaluator with a daemon-owned negative control", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            disguisedConstantEvaluator: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            disguisedConstantEvaluator: true
        });

        const outcome = await runResearchLoop(workspace, {
            harnesses: [codex, claude],
            plateauInactivityMs: 1
        });

        expect(outcome.status, outcome.reason).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        expect(workspace.getSnapshot().claims.map(({ status }) => status)).not.toContain(
            ClaimStatus.SUPPORTED
        );
        expect(workspace.getSnapshot().frontier.blockers).toEqual(
            expect.arrayContaining([
                expect.stringContaining("supports daemon-owned negative-control artifacts")
            ])
        );
        expect(workspace.getEvidence()).toHaveLength(0);
    });

    it("does not accept outcome artifacts created in the separate precommit workspace", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            precommitOutcomeOnly: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            precommitOutcomeOnly: true
        });

        const outcome = await runResearchLoop(workspace, {
            harnesses: [codex, claude],
            plateauInactivityMs: 1
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        expect(workspace.getSnapshot().claims.map(({ status }) => status)).not.toContain(
            ClaimStatus.SUPPORTED
        );
        expect([...codex.researcherInitialEntries, ...claude.researcherInitialEntries]).toEqual(
            expect.arrayContaining([[".git"]])
        );
        expect(
            workspace
                .getSnapshot()
                .experiments.some(({ evaluator }) => evaluator === "Daemon-owned outcome executor")
        ).toBe(false);
    });

    it("rejects provider endpoints and nested model harnesses in daemon execution plans", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            forbiddenOutcomeCommands: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            forbiddenOutcomeCommands: true
        });

        const outcome = await runResearchLoop(workspace, {
            harnesses: [codex, claude],
            plateauInactivityMs: 1
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        expect(
            workspace
                .getSnapshot()
                .experiments.some(({ evaluator }) => evaluator === "Daemon-owned outcome executor")
        ).toBe(false);
        expect(workspace.getEvidence().some(({ supports }) => supports)).toBe(false);
        expect(workspace.getSnapshot().frontier.blockers).toEqual(
            expect.arrayContaining([
                expect.stringContaining("subscription-only policy"),
                expect.stringContaining("model clients")
            ])
        );
    });

    it("rejects verifier artifacts created directly by the planning harness", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            fabricatedVerifierArtifactPath: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            fabricatedVerifierArtifactPath: true
        });

        const outcome = await runResearchLoop(workspace, {
            harnesses: [codex, claude],
            plateauInactivityMs: 1
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.FAILED);
        expect(workspace.getSnapshot().claims.map(({ status }) => status)).not.toContain(
            ClaimStatus.REPRODUCED
        );
        expect(
            workspace.getEvidence().some(({ kind }) => kind === EvidenceKind.VERIFIER_RESULT)
        ).toBe(false);
    });

    it("isolates daemon outcome processes from provider credentials and subscription homes", async () => {
        const workspace = await createWorkspace();
        const markerRoot = await mkdtemp(path.join(tmpdir(), "lab-outcome-auth-marker-"));
        await writeFile(path.join(markerRoot, "auth-marker"), "must not be visible");
        const previousCodexHome = process.env.CODEX_HOME;
        const previousOpenAiKey = process.env.OPENAI_API_KEY;
        const previousAnthropicKey = process.env.ANTHROPIC_API_KEY;
        process.env.CODEX_HOME = markerRoot;
        process.env.OPENAI_API_KEY = "test-provider-key";
        process.env.ANTHROPIC_API_KEY = "test-provider-key";

        try {
            const outcome = await runResearchLoop(workspace, {
                harnesses: [
                    new ScriptedHarness(HarnessKinds.CODEX, {
                        inspectOutcomeEnvironment: true
                    }),
                    new ScriptedHarness(HarnessKinds.CLAUDE, {
                        inspectOutcomeEnvironment: true
                    })
                ],
                plateauInactivityMs: 1
            });

            expect(outcome.status).toBe(ResearchLoopOutcomeStatus.COMPLETED);
            const observation = await findOutcomeEnvironmentObservation(workspace);
            expect(observation.provider_api_keys_absent).toBe(true);
            expect(observation.auth_marker_visible).toBe(false);
            expect(observation.home).toBe(observation.codex_home);
            expect(observation.home).toBe(observation.claude_config_dir);
            expect(path.basename(observation.home)).toBe(".lab-empty-model-auth");
            expect(observation.home).not.toBe(markerRoot);
        } finally {
            restoreEnvironmentVariable("CODEX_HOME", previousCodexHome);
            restoreEnvironmentVariable("OPENAI_API_KEY", previousOpenAiKey);
            restoreEnvironmentVariable("ANTHROPIC_API_KEY", previousAnthropicKey);
        }
    });

    it("pauses a capability-blocked verifier without executing a fabricated plan", async () => {
        const workspace = await createWorkspace();
        const outcome = await runResearchLoop(workspace, {
            harnesses: [
                new ScriptedHarness(HarnessKinds.CODEX, {
                    requestVerifierCapability: true
                }),
                new ScriptedHarness(HarnessKinds.CLAUDE, {
                    requestVerifierCapability: true
                })
            ],
            plateauInactivityMs: 1
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        const snapshot = workspace.getSnapshot();
        const verifierTask = snapshot.tasks.find(({ role }) => role === AgentRole.VERIFIER);
        if (verifierTask === undefined) {
            throw new Error("Expected a capability-blocked verifier task");
        }
        expect(verifierTask).toMatchObject({
            status: InternalTaskStatus.QUEUED,
            context_refs: [expect.any(String)]
        });
        expect(
            snapshot.agents.find(({ branch_id }) => branch_id === verifierTask.branch_id)
        ).toMatchObject({ status: AgentStatus.BLOCKED });
        expect(snapshot.branches.find(({ id }) => id === verifierTask.branch_id)).toMatchObject({
            status: BranchStatus.PAUSED
        });
        expect(
            snapshot.experiments.some(
                ({ task_id: taskId, evaluator }) =>
                    taskId === verifierTask.id && evaluator === "Daemon-owned outcome executor"
            )
        ).toBe(false);
        expect(snapshot.capability_requests).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    need: DatasetCapabilityFixture.NEED,
                    status: CapabilityStatus.OPEN
                })
            ])
        );
    });

    it("requests capabilities and hibernates without running an unauthenticated harness", async () => {
        const workspace = await createWorkspace();

        const outcome = await runResearchLoop(workspace, {
            harnesses: [
                new UnavailableHarness(HarnessKinds.CODEX),
                new UnavailableHarness(HarnessKinds.CLAUDE)
            ]
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        expect(workspace.getSnapshot().lab.state).toBe(LabState.HIBERNATING);
        expect(workspace.getSnapshot().capability_requests).toHaveLength(2);
        expect(workspace.getEvents().map(({ type }) => type)).toEqual(
            expect.arrayContaining([
                EventType.HARNESS_PREFLIGHT_FAILED,
                EventType.CAPABILITY_REQUESTED,
                EventType.PLATEAU_CONFIRMED,
                EventType.LAB_HIBERNATED
            ])
        );
    });

    it("includes provided capability resources after restarting at cycle zero", async () => {
        const workspace = await createWorkspace();
        const blocked = await runResearchLoop(workspace, {
            harnesses: [new UnavailableHarness(HarnessKinds.CODEX)]
        });
        expect(blocked.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        const request = workspace.getSnapshot().capability_requests[0];
        if (request === undefined) {
            throw new Error("Expected the unavailable harness to request a capability");
        }
        await workspace.provideCapability(request.id, CapabilityFixture.RESOURCE_REFERENCE);
        const provided = workspace
            .getSnapshot()
            .capability_requests.find(({ id }) => id === request.id);
        if (provided?.provided_at === undefined) {
            throw new Error("Expected the capability to have operational resource state");
        }
        const harness = new ScriptedHarness(HarnessKinds.CODEX);

        const outcome = await runResearchLoop(workspace, { harnesses: [harness] });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.COMPLETED);
        expect(harness.requests).toHaveLength(7);
        for (const run of harness.requests) {
            expect(run.prompt).toContain(CapabilityFixture.CONTEXT_TYPE);
            expect(run.prompt).toContain("resource_reference");
            expect(run.prompt).toContain(CapabilityFixture.RESOURCE_REFERENCE);
            expect(run.prompt).toContain("provided_at");
            expect(run.prompt).toContain(provided.provided_at);
            expect(run.prompt).not.toContain('"need":');
            expect(run.prompt).not.toContain('"provisioning_hint":');
        }
    });

    it("continues a recovered frontier in a fresh cycle with persisted context", async () => {
        const workspace = await createWorkspace();
        const initialIds = initialResearchIdentifiers(workspace.labId);
        await workspace.update((draft) => {
            draft.frontier.known.push(RecoveryContextFixture.KNOWN);
            draft.frontier.open_questions.push(RecoveryContextFixture.OPEN_QUESTION);
            draft.frontier.blockers.push(RecoveryContextFixture.BLOCKER);
            draft.frontier.next_experiments.push(RecoveryContextFixture.NEXT_EXPERIMENT);
            draft.claims.push({
                id: RecoveryContextFixture.CLAIM_ID,
                branch_id: initialIds.branchId,
                statement: RecoveryContextFixture.CLAIM_STATEMENT,
                status: ClaimStatus.TESTING,
                assumption_ids: [],
                supporting_evidence_ids: [],
                contradicting_evidence_ids: [],
                stale: false,
                created_at: draft.lab.updated_at,
                updated_at: draft.lab.updated_at
            });
        });
        const request = await workspace.requestCapability({
            need: RecoveryContextFixture.CAPABILITY_NEED,
            reason: RecoveryContextFixture.CAPABILITY_REASON,
            provisioningHint: RecoveryContextFixture.CAPABILITY_HINT
        });
        await workspace.provideCapability(request.id, RecoveryContextFixture.RESOURCE_REFERENCE);
        const workspaceRoot = path.dirname(path.dirname(workspace.runDirectory));
        const recovered = await LabWorkspace.openOrCreate(
            workspaceRoot,
            path.join(workspaceRoot, "task.json")
        );
        const codex = new CapabilityLossHarness(HarnessKinds.CODEX, PromptRole.DIRECTOR);
        const claude = new CapabilityLossHarness(HarnessKinds.CLAUDE, PromptRole.DIRECTOR);

        const outcome = await runResearchLoop(recovered, { harnesses: [codex, claude] });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        const directorRequests = [...codex.requests, ...claude.requests];
        expect(directorRequests).toHaveLength(2);
        for (const run of directorRequests) {
            expect(run.prompt).toContain(RecoveryContextFixture.KNOWN);
            expect(run.prompt).toContain(RecoveryContextFixture.OPEN_QUESTION);
            expect(run.prompt).toContain(RecoveryContextFixture.BLOCKER);
            expect(run.prompt).toContain(RecoveryContextFixture.NEXT_EXPERIMENT);
            expect(run.prompt).toContain(RecoveryContextFixture.CLAIM_STATEMENT);
            expect(run.prompt).toContain(CapabilityFixture.CONTEXT_TYPE);
            expect(run.prompt).toContain(RecoveryContextFixture.RESOURCE_REFERENCE);
        }
        const recoveredDirectorBranchIds = recovered
            .getEvents()
            .filter(
                ({ type, payload }) =>
                    type === EventType.HARNESS_RUN_STARTED &&
                    payload.stage === ResearchStage.DIRECTOR
            )
            .map(({ payload }) => payload.branch_id);
        expect(new Set(recoveredDirectorBranchIds).size).toBe(1);
        expect(recoveredDirectorBranchIds).not.toContain(initialIds.branchId);
    });

    it("never treats a provided subscription reference as harness authentication", async () => {
        const workspace = await createWorkspace();
        const harness = new UnavailableHarness(HarnessKinds.CODEX);
        const first = await runResearchLoop(workspace, { harnesses: [harness] });
        expect(first.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        const request = workspace.getSnapshot().capability_requests[0];
        if (request === undefined) {
            throw new Error("Expected a subscription capability request");
        }
        await workspace.provideCapability(request.id, CapabilityFixture.RESOURCE_REFERENCE);

        const second = await runResearchLoop(workspace, { harnesses: [harness] });

        expect(second.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        expect(harness.preflightCalls).toBe(2);
        expect(workspace.getSnapshot().lab.state).toBe(LabState.HIBERNATING);
        expect(workspace.getSnapshot().capability_requests).toEqual([
            expect.objectContaining({
                id: request.id,
                status: CapabilityStatus.PROVIDED,
                resource_reference: CapabilityFixture.RESOURCE_REFERENCE
            }),
            expect.objectContaining({ status: CapabilityStatus.OPEN })
        ]);
        expect(workspace.getEvents().map(({ type }) => type)).not.toContain(
            EventType.HARNESS_RUN_STARTED
        );
    });

    it("hibernates when every preflighted harness loses a critical-stage capability", async () => {
        const workspace = await createWorkspace();

        const outcome = await runResearchLoop(workspace, {
            harnesses: [
                new CapabilityLossHarness(HarnessKinds.CODEX, PromptRole.DIRECTOR),
                new CapabilityLossHarness(HarnessKinds.CLAUDE, PromptRole.DIRECTOR)
            ]
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        expect(workspace.getSnapshot().lab.state).toBe(LabState.HIBERNATING);
        expect(workspace.getSnapshot().capability_requests).toEqual([
            expect.objectContaining({ need: CapabilityFixture.NEED })
        ]);
        expect(workspace.getEvents().map(({ type }) => type)).not.toContain(EventType.LAB_FAILED);
        expect(
            workspace.getEvents().find(({ type }) => type === EventType.PLATEAU_CONFIRMED)?.payload
        ).toMatchObject({ capability_blocked: true });
    });

    it("fails honestly when critical-stage fallback mixes capability and run failures", async () => {
        const workspace = await createWorkspace();

        const outcome = await runResearchLoop(workspace, {
            harnesses: [
                new CapabilityLossHarness(HarnessKinds.CODEX, PromptRole.DIRECTOR),
                new FailingOnceHarness(HarnessKinds.CLAUDE, PromptRole.DIRECTOR)
            ]
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.FAILED);
        expect(workspace.getSnapshot().lab.state).toBe(LabState.FAILED);
        expect(workspace.getSnapshot().capability_requests).toHaveLength(1);
        expect(workspace.getEvents().map(({ type }) => type)).toContain(EventType.LAB_FAILED);
    });

    it("retries a failed critic through the other subscription CLI in a fresh workspace", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX);
        const claude = new FailingOnceHarness(HarnessKinds.CLAUDE, PromptRole.CRITIC);

        const outcome = await runResearchLoop(workspace, { harnesses: [codex, claude] });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.COMPLETED);
        const failedRun = workspace
            .getEvents()
            .find(({ type }) => type === EventType.HARNESS_RUN_FAILED);
        expect(failedRun?.payload).toMatchObject({
            harness: HarnessKinds.CLAUDE,
            stage: ResearchStage.CRITIC,
            manifest_path: expect.any(String),
            manifest_sha256: expect.any(String)
        });
        const criticDirectories = [...codex.requests, ...claude.requests]
            .filter(({ prompt }) => prompt.includes(PromptRole.CRITIC))
            .map(({ cwd }) => cwd);
        expect(new Set(criticDirectories).size).toBe(2);
    });

    it("retries a critic whose evaluator precommit is trivial", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX);
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            trivialCriticEvaluator: true
        });

        const outcome = await runResearchLoop(workspace, { harnesses: [codex, claude] });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.COMPLETED);
        const criticRequests = [...codex.requests, ...claude.requests].filter(({ prompt }) =>
            prompt.includes(PromptRole.CRITIC)
        );
        expect(criticRequests).toHaveLength(2);
        expect(new Set(criticRequests.map(({ cwd }) => cwd)).size).toBe(2);
    });

    it("does not treat a comment-only evaluator variant as independent", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX);
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            cosmeticCriticEvaluator: true
        });

        const outcome = await runResearchLoop(workspace, { harnesses: [codex, claude] });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.COMPLETED);
        expect(
            claude.requests.filter(({ prompt }) => prompt.includes(PromptRole.CRITIC))
        ).toHaveLength(1);
        expect(
            codex.requests.filter(({ prompt }) => prompt.includes(PromptRole.CRITIC))
        ).toHaveLength(1);
    });

    it("preserves a failed researcher manifest as a negative experiment attempt", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX);
        const claude = new FailingOnceHarness(HarnessKinds.CLAUDE, PromptRole.RESEARCHER);

        const outcome = await runResearchLoop(workspace, { harnesses: [codex, claude] });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.COMPLETED);
        expect(workspace.getSnapshot().experiments).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    status: ExperimentStatus.FAILED,
                    output_path: expect.any(String),
                    output_hash: expect.any(String)
                }),
                expect.objectContaining({ status: ExperimentStatus.SUCCEEDED })
            ])
        );
    });

    it("records a timed-out researcher and retries through the other subscription CLI", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX);
        const claude = new FailingOnceHarness(
            HarnessKinds.CLAUDE,
            PromptRole.RESEARCHER,
            HarnessRunStatuses.TIMED_OUT
        );

        const outcome = await runResearchLoop(workspace, { harnesses: [codex, claude] });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.COMPLETED);
        expect(workspace.getSnapshot().experiments).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    status: ExperimentStatus.TIMED_OUT,
                    output_path: expect.any(String),
                    output_hash: expect.any(String)
                })
            ])
        );
        expect(workspace.getEvents().map(({ type }) => type)).toEqual(
            expect.arrayContaining([
                EventType.HARNESS_RUN_TIMED_OUT,
                EventType.EXPERIMENT_TIMED_OUT,
                EventType.ATTEMPT_TIMED_OUT
            ])
        );
    });

    it("does not automatically retry an interrupted irreversible outcome attempt", async () => {
        const workspace = await createWorkspace();
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            irreversibleOutcomeTimeout: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            irreversibleOutcomeTimeout: true
        });

        const outcome = await runResearchLoop(workspace, {
            harnesses: [codex, claude],
            plateauInactivityMs: 1
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        expect(
            claude.requests.filter(({ prompt }) => prompt.includes(PromptRole.RESEARCHER))
        ).toHaveLength(1);
        expect(
            codex.requests.filter(({ prompt }) => prompt.includes(PromptRole.RESEARCHER))
        ).toHaveLength(1);
        expect(workspace.getSnapshot().experiments).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    evaluator: "Daemon-owned outcome executor",
                    status: ExperimentStatus.TIMED_OUT,
                    external_effect: ExternalEffect.IRREVERSIBLE,
                    reconciliation_key: expect.stringMatching(/^irreversible-/u),
                    output_path: expect.any(String),
                    output_hash: expect.stringMatching(/^[a-f\d]{64}$/u)
                })
            ])
        );
        expect(
            workspace
                .getSnapshot()
                .experiments.filter(
                    ({ evaluator, external_effect: externalEffect }) =>
                        evaluator === "Daemon-owned outcome executor" &&
                        externalEffect === ExternalEffect.IRREVERSIBLE
                )
        ).toHaveLength(1);

        await workspace.transition(LabState.RUNNING, "retry-safety audit", {
            wakeTrigger: WakeTrigger.USER
        });
        const recoveredWorkspace = await LabWorkspace.load(
            path.dirname(path.dirname(workspace.runDirectory)),
            workspace.runDirectory
        );
        const recovered = await runResearchLoop(recoveredWorkspace, {
            harnesses: [
                new ScriptedHarness(HarnessKinds.CODEX, {
                    irreversibleOutcomeTimeout: true
                }),
                new ScriptedHarness(HarnessKinds.CLAUDE, {
                    irreversibleOutcomeTimeout: true
                })
            ],
            plateauInactivityMs: 1
        });

        expect(recovered.status).toBe(ResearchLoopOutcomeStatus.HIBERNATING);
        expect(
            recoveredWorkspace
                .getSnapshot()
                .experiments.filter(
                    ({ evaluator, external_effect: externalEffect }) =>
                        evaluator === "Daemon-owned outcome executor" &&
                        externalEffect === ExternalEffect.IRREVERSIBLE
                )
        ).toHaveLength(1);
    });

    it("does not complete when the critic refutes the candidate", async () => {
        const workspace = await createWorkspace();
        const abortController = new AbortController();
        const codex = new ScriptedHarness(HarnessKinds.CODEX);
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            criticVerdict: CRITIC_VERDICT.REFUTED
        });

        const outcome = await runResearchLoop(workspace, {
            harnesses: [codex, claude],
            signal: abortController.signal,
            waitForCycle: async () => abortController.abort(new Error("test cycle observed"))
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.CANCELLED);
        expect(workspace.getSnapshot().lab.state).toBe(LabState.RUNNING);
        expect(workspace.getSnapshot().claims).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ status: ClaimStatus.REPRODUCED })])
        );
        expect(workspace.getSnapshot().frontier.known).toContain(
            "A held-out workload did not improve"
        );
        expect(workspace.getEvents().map(({ type }) => type)).not.toContain(
            EventType.LAB_COMPLETED
        );
    });

    it("tests an explicit assumption and marks every dependent claim stale when falsified", async () => {
        const workspace = await createWorkspace();
        const abortController = new AbortController();
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            falsifyAssumption: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE, {
            falsifyAssumption: true
        });

        const outcome = await runResearchLoop(workspace, {
            harnesses: [codex, claude],
            signal: abortController.signal,
            waitForCycle: async () => abortController.abort(new Error("test cycle observed"))
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.CANCELLED);
        const assumption = workspace
            .getSnapshot()
            .claims.find(
                ({ statement }) =>
                    statement === "The benchmark workload represents production traffic"
            );
        const dependentClaim = workspace
            .getSnapshot()
            .claims.find(({ statement }) => statement === "The candidate is faster");
        expect(assumption).toMatchObject({
            status: ClaimStatus.REFUTED,
            stale: false,
            contradicting_evidence_ids: expect.arrayContaining([expect.any(String)])
        });
        expect(dependentClaim).toMatchObject({
            status: ClaimStatus.TESTING,
            stale: true,
            assumption_ids: [assumption?.id]
        });
        expect(workspace.getEvents()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: EventType.CLAIM_STALE,
                    payload: expect.objectContaining({
                        claim_id: dependentClaim?.id,
                        refuted_assumption_id: assumption?.id
                    })
                })
            ])
        );
    });

    it("reopens a stale claim for testing before accepting evidence from a new cycle", async () => {
        const workspace = await createWorkspace();
        const initialBranch = workspace.getSnapshot().branches[0];
        if (initialBranch === undefined) {
            throw new Error("Expected an initial research branch");
        }
        const claimId = `claim-${randomUUID()}`;
        const createdAt = new Date().toISOString();
        await workspace.update((draft) => {
            draft.claims.push({
                id: claimId,
                branch_id: initialBranch.id,
                statement: "The candidate is faster",
                status: ClaimStatus.SUPPORTED,
                assumption_ids: [],
                supporting_evidence_ids: [],
                contradicting_evidence_ids: [],
                stale: true,
                created_at: createdAt,
                updated_at: createdAt
            });
        });
        const abortController = new AbortController();
        const running = runResearchLoop(workspace, {
            harnesses: [new ScriptedHarness(HarnessKinds.CODEX)],
            signal: abortController.signal
        });
        await waitUntil(() =>
            workspace
                .getEvents()
                .some(
                    ({ type, payload }) =>
                        type === EventType.CLAIM_TESTING &&
                        payload.claim_id === claimId &&
                        payload.stale_evidence_invalidated === true
                )
        );

        abortController.abort(new Error("stale claim retest observed"));
        await running;

        expect(workspace.getSnapshot().claims.find(({ id }) => id === claimId)?.stale).toBe(false);
    });

    it("rejects a reproduced verdict whose evaluator and artifacts do not exist", async () => {
        const workspace = await createWorkspace();
        const abortController = new AbortController();
        const codex = new ScriptedHarness(HarnessKinds.CODEX, {
            missingVerifierArtifacts: true
        });
        const claude = new ScriptedHarness(HarnessKinds.CLAUDE);

        const outcome = await runResearchLoop(workspace, {
            harnesses: [codex, claude],
            signal: abortController.signal,
            waitForCycle: async () => abortController.abort(new Error("test cycle observed"))
        });

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.CANCELLED);
        expect(workspace.getSnapshot().claims).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ status: ClaimStatus.REPRODUCED })])
        );
        expect(
            workspace.getEvidence().filter(({ kind }) => kind === EvidenceKind.VERIFIER_RESULT)
        ).toHaveLength(0);
        expect(workspace.getEvents().map(({ type }) => type)).not.toContain(
            EventType.LAB_COMPLETED
        );
        expect(
            workspace.getSnapshot().tasks.find(({ role }) => role === AgentRole.VERIFIER)?.status
        ).toBe(InternalTaskStatus.FAILED);
    });

    it("cancels an in-flight CLI harness through AbortSignal without completing the lab", async () => {
        const workspace = await createWorkspace();
        const harness = new BlockingHarness(HarnessKinds.CODEX);
        const abortController = new AbortController();
        const running = runResearchLoop(workspace, {
            harnesses: [harness],
            signal: abortController.signal
        });
        await harness.started;

        abortController.abort(new Error("daemon closing"));
        const outcome = await running;

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.CANCELLED);
        expect(workspace.getSnapshot().lab.state).toBe(LabState.RUNNING);
        expect(workspace.getEvents().map(({ type }) => type)).toContain(
            EventType.HARNESS_RUN_CANCELLED
        );
    });

    it("propagates caller cancellation during preflight without requesting capabilities", async () => {
        const workspace = await createWorkspace();
        const harness = new BlockingPreflightHarness();
        const abortController = new AbortController();
        const running = runResearchLoop(workspace, {
            harnesses: [harness],
            signal: abortController.signal
        });
        await harness.started;

        abortController.abort(new Error("daemon closing"));
        const outcome = await running;

        expect(outcome.status).toBe(ResearchLoopOutcomeStatus.CANCELLED);
        expect(workspace.getSnapshot().lab.state).toBe(LabState.RUNNING);
        expect(workspace.getSnapshot().capability_requests).toHaveLength(0);
        expect(workspace.getEvents().map(({ type }) => type)).not.toContain(
            EventType.PLATEAU_CONFIRMED
        );
    });
});

function evaluatorProgram(input: {
    field: string;
    expected: string;
    successContract: string;
    supportsWhen: (typeof EvaluatorComparison)[keyof typeof EvaluatorComparison];
    delayMs?: number;
    mutateArtifact?: boolean;
}): string {
    return `#!/usr/bin/env node
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const daemonInput = JSON.parse(Buffer.concat(chunks).toString("utf8"));
const fs = await import("node:fs/promises");
const artifactPath = daemonInput.artifacts[0].path;
const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
const observed = artifact[${JSON.stringify(input.field)}];
const passed = ${
        input.supportsWhen === EvaluatorComparison.LESS_THAN
            ? `Number.isFinite(observed) && observed < ${Number(input.expected)}`
            : "Boolean(observed)"
    };
${input.mutateArtifact === true ? 'await fs.chmod(artifactPath, 0o600); await fs.writeFile(artifactPath, "{\\"elapsed_ms\\":999}");' : ""}
const verdict = passed ? ${JSON.stringify(EVALUATOR_VERDICT.SUPPORTS)} : ${JSON.stringify(EVALUATOR_VERDICT.CONTRADICTS)};
${input.delayMs === undefined ? "" : `await new Promise((resolve) => setTimeout(resolve, ${input.delayMs}));`}
process.stdout.write(JSON.stringify({
    schema_version: 1,
    verdict,
    target_statement_sha256: daemonInput.target.statement_sha256,
    input_binding_sha256: daemonInput.input_binding_sha256,
    artifact_sha256s: daemonInput.artifacts.map(({ sha256 }) => sha256),
    success_contract: daemonInput.evaluator.success_contract,
    checks: [{
        name: ${JSON.stringify(`validate ${input.field}`)},
        passed,
        observed: String(observed),
        expected: ${JSON.stringify(input.expected)}
    }],
    summary: passed ? "Structured evaluator supports the target" : "Structured evaluator contradicts the target"
}));
`;
}

function constantSupportingEvaluatorProgram(): string {
    return `#!/usr/bin/env node
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const daemonInput = JSON.parse(Buffer.concat(chunks).toString("utf8"));
process.stdout.write(JSON.stringify({
    schema_version: 1,
    verdict: ${JSON.stringify(EVALUATOR_VERDICT.SUPPORTS)},
    target_statement_sha256: daemonInput.target.statement_sha256,
    input_binding_sha256: daemonInput.input_binding_sha256,
    artifact_sha256s: daemonInput.artifacts.map(({ sha256 }) => sha256),
    success_contract: daemonInput.evaluator.success_contract,
    checks: [{ name: "always accept", passed: true, observed: "ignored", expected: "ignored" }],
    summary: "Everything is accepted"
}));
`;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
    const deadline = Date.now() + 15_000;
    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error("Timed out waiting for research-loop test condition");
        }
        await delay(10);
    }
}

interface OutcomeEnvironmentObservation {
    readonly home: string;
    readonly codex_home: string;
    readonly claude_config_dir: string;
    readonly provider_api_keys_absent: boolean;
    readonly auth_marker_visible: boolean;
}

async function findOutcomeEnvironmentObservation(
    workspace: LabWorkspace
): Promise<OutcomeEnvironmentObservation> {
    for (const evidence of workspace.getEvidence()) {
        if (evidence.kind !== EvidenceKind.ARTIFACT || evidence.artifact_path === undefined) {
            continue;
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(await readFile(evidence.artifact_path, "utf8"));
        } catch {
            continue;
        }
        if (typeof parsed !== "object" || parsed === null || !("outcome_env" in parsed)) {
            continue;
        }
        const outcomeEnvironment = parsed.outcome_env;
        if (
            typeof outcomeEnvironment !== "object" ||
            outcomeEnvironment === null ||
            !("home" in outcomeEnvironment) ||
            typeof outcomeEnvironment.home !== "string" ||
            !("codex_home" in outcomeEnvironment) ||
            typeof outcomeEnvironment.codex_home !== "string" ||
            !("claude_config_dir" in outcomeEnvironment) ||
            typeof outcomeEnvironment.claude_config_dir !== "string" ||
            !("provider_api_keys_absent" in outcomeEnvironment) ||
            typeof outcomeEnvironment.provider_api_keys_absent !== "boolean" ||
            !("auth_marker_visible" in outcomeEnvironment) ||
            typeof outcomeEnvironment.auth_marker_visible !== "boolean"
        ) {
            continue;
        }
        return {
            home: outcomeEnvironment.home,
            codex_home: outcomeEnvironment.codex_home,
            claude_config_dir: outcomeEnvironment.claude_config_dir,
            provider_api_keys_absent: outcomeEnvironment.provider_api_keys_absent,
            auth_marker_visible: outcomeEnvironment.auth_marker_visible
        };
    }
    throw new Error("Expected a daemon outcome environment observation artifact");
}

function restoreEnvironmentVariable(name: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[name];
        return;
    }
    process.env[name] = value;
}

async function createWorkspace(
    task: { goal: string; context: string[]; success_criteria: string[] } = {
        goal: "Find and independently reproduce a speedup",
        context: [],
        success_criteria: ["A clean verifier reproduces the result"]
    }
): Promise<LabWorkspace> {
    const directory = await mkdtemp(path.join(tmpdir(), "lab-research-loop-"));
    const taskPath = path.join(directory, "task.json");
    await writeFile(taskPath, JSON.stringify(task));
    return LabWorkspace.initialize(directory, taskPath);
}

function preflight(kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE): HarnessPreflight {
    return {
        kind,
        cliVersion: "test-cli",
        authentication: {
            method:
                kind === HarnessKinds.CODEX
                    ? HarnessAuthenticationMethods.CHATGPT
                    : HarnessAuthenticationMethods.CLAUDE_AI,
            subscription: kind === HarnessKinds.CODEX ? null : "test-subscription"
        }
    };
}

async function harnessResult(
    kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE,
    request: HarnessRunRequest,
    structuredOutput: unknown,
    status: HarnessRunResult["status"] = HarnessRunStatuses.SUCCEEDED
): Promise<HarnessRunResult> {
    const artifactDirectory = path.join(request.cwd, ".mock-harness", randomUUID());
    await mkdir(artifactDirectory, { recursive: true });
    const manifestPath = path.join(artifactDirectory, "harness-run.json");
    const manifestContent = JSON.stringify({ structuredOutput });
    await writeFile(manifestPath, manifestContent);
    const artifact = {
        path: manifestPath,
        bytes: Buffer.byteLength(manifestContent),
        sha256: createHash("sha256").update(manifestContent).digest("hex")
    };
    const now = new Date().toISOString();
    return {
        kind,
        status,
        cliVersion: "test-cli",
        authentication: preflight(kind).authentication,
        sessionId: `session-${randomUUID()}`,
        structuredOutput,
        startedAt: now,
        finishedAt: now,
        exitCode: status === HarnessRunStatuses.SUCCEEDED ? 0 : 1,
        signal: null,
        timeoutMs: request.timeoutMs ?? HarnessTimeoutMilliseconds.RUN,
        error: status === HarnessRunStatuses.SUCCEEDED ? null : "scripted harness failure",
        command: {
            file: `test-${kind}`,
            args: [],
            cwd: request.cwd,
            stdin: HarnessInputSources.PROMPT,
            removedEnvironmentVariables: []
        },
        artifacts: {
            prompt: artifact,
            nativeEvents: artifact,
            events: artifact,
            stderr: artifact,
            manifest: artifact
        }
    };
}
