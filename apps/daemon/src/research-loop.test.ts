import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    type AgentHarness,
    HarnessAuthenticationMethods,
    type HarnessEvent,
    HarnessEventTypes,
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
    AgentStatus,
    BranchStatus,
    CapabilityStatus,
    ClaimStatus,
    EventType,
    EvidenceKind,
    ExperimentStatus,
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
    RESOURCE_REFERENCE: "subscription-session://restored/v1",
    CONTEXT_TYPE: "provided_capability"
} as const;

const DatasetCapabilityFixture = {
    NEED: "Held-out production-shaped benchmark dataset",
    REASON: "The indexing direction cannot validate representativeness without the dataset",
    PROVISIONING_HINT: "Attach a read-only dataset snapshot to the research workspace",
    DIRECTION_TITLE: "Indexing"
} as const;

class ScriptedHarness implements AgentHarness {
    readonly kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE;
    readonly requests: HarnessRunRequest[] = [];
    readonly verifierInitialEntries: string[][] = [];
    readonly #criticVerdict: (typeof CRITIC_VERDICT)[keyof typeof CRITIC_VERDICT];
    readonly #falsifyAssumption: boolean;
    readonly #missingVerifierArtifacts: boolean;
    readonly #mutateEvaluatorAfterOutcome: boolean;
    readonly #trivialEvaluator: boolean;
    readonly #requestDatasetForIndexing: boolean;

    constructor(
        kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE,
        options: {
            criticVerdict?: (typeof CRITIC_VERDICT)[keyof typeof CRITIC_VERDICT];
            falsifyAssumption?: boolean;
            missingVerifierArtifacts?: boolean;
            mutateEvaluatorAfterOutcome?: boolean;
            trivialEvaluator?: boolean;
            requestDatasetForIndexing?: boolean;
        } = {}
    ) {
        this.kind = kind;
        this.#criticVerdict = options.criticVerdict ?? CRITIC_VERDICT.CREDIBLE;
        this.#falsifyAssumption = options.falsifyAssumption ?? false;
        this.#missingVerifierArtifacts = options.missingVerifierArtifacts ?? false;
        this.#mutateEvaluatorAfterOutcome = options.mutateEvaluatorAfterOutcome ?? false;
        this.#trivialEvaluator = options.trivialEvaluator ?? false;
        this.#requestDatasetForIndexing = options.requestDatasetForIndexing ?? false;
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
                    {
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
            const targetKind = this.#falsifyAssumption
                ? RESEARCH_TARGET_KIND.ASSUMPTION
                : RESEARCH_TARGET_KIND.CLAIM;
            const successContract = this.#falsifyAssumption
                ? "The held-out workload must be representative"
                : "Measured elapsed_ms must be below 20";
            await writeFile(
                evaluatorPath,
                this.#trivialEvaluator
                    ? "#!/usr/bin/env node\nprocess.exit(0);\n"
                    : evaluatorProgram({
                          field: this.#falsifyAssumption ? "representative" : "elapsed_ms",
                          expected: this.#falsifyAssumption ? "true" : "20",
                          successContract,
                          supportsWhen: this.#falsifyAssumption
                              ? EvaluatorComparison.TRUTHY
                              : EvaluatorComparison.LESS_THAN
                      })
            );
            await chmod(evaluatorPath, 0o755);
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
            const datasetBlocked =
                this.#requestDatasetForIndexing &&
                request.prompt.includes(`"title": "${DatasetCapabilityFixture.DIRECTION_TITLE}"`);
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
                const artifactPath = path.join(
                    request.cwd,
                    `measurement-${this.requests.length}.json`
                );
                await writeFile(
                    artifactPath,
                    JSON.stringify(
                        this.#falsifyAssumption ? { representative: false } : { elapsed_ms: 12 }
                    )
                );
                if (this.#mutateEvaluatorAfterOutcome) {
                    await writeFile(
                        path.join(request.cwd, "evaluate-research"),
                        "#!/usr/bin/env node\nprocess.exit(0);\n"
                    );
                }
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
                            artifact_paths: [path.basename(artifactPath)],
                            contradicts_hypothesis: this.#falsifyAssumption
                        }
                    ],
                    limitations: [],
                    next_experiments: []
                };
            }
        } else if (request.prompt.includes(PromptRole.CRITIC)) {
            const evaluatorPath = path.join(request.cwd, "verify-independent");
            const successContract = "Independent elapsed_ms must be below 15";
            await writeFile(
                evaluatorPath,
                evaluatorProgram({
                    field: "elapsed_ms",
                    expected: "15",
                    successContract,
                    supportsWhen: EvaluatorComparison.LESS_THAN
                })
            );
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
                    args: ["--independent"],
                    success_contract: successContract
                }
            };
        } else if (request.prompt.includes(PromptRole.VERIFIER)) {
            this.verifierInitialEntries.push(await readdir(request.cwd));
            const artifactPath = path.join(request.cwd, "independent-reproduction.json");
            if (!this.#missingVerifierArtifacts) {
                await writeFile(artifactPath, JSON.stringify({ elapsed_ms: 11 }));
            }
            output = {
                verdict: VERIFIER_VERDICT.REPRODUCED,
                claim_index: 0,
                result_statement: "An independent benchmark reproduced the speedup",
                evidence_artifact_paths: [artifactPath],
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

    constructor(kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE) {
        this.kind = kind;
    }

    preflight(): Promise<HarnessPreflight> {
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
        expect(workspace.getSnapshot().experiments).toHaveLength(5);
        expect(
            workspace
                .getSnapshot()
                .experiments.every(({ status }) => status === ExperimentStatus.SUCCEEDED)
        ).toBe(true);
        expect(workspace.getEvidence().some(({ kind }) => kind === EvidenceKind.ARTIFACT)).toBe(
            true
        );
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
        expect(runDirectories.size).toBe(5);
        expect([...codex.verifierInitialEntries, ...claude.verifierInitialEntries]).toEqual([
            [".git"]
        ]);
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
                        success_contract: expect.any(String)
                    })
                })
            ])
        );
        await expect(
            readFile(path.join(workspace.runDirectory, "result.json"), "utf8")
        ).resolves.toContain("independent benchmark reproduced");
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
        }
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
}): string {
    return `#!/usr/bin/env node
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const daemonInput = JSON.parse(Buffer.concat(chunks).toString("utf8"));
const artifact = JSON.parse(await (await import("node:fs/promises")).readFile(daemonInput.artifacts[0].path, "utf8"));
const observed = artifact[${JSON.stringify(input.field)}];
const passed = ${
        input.supportsWhen === EvaluatorComparison.LESS_THAN
            ? `Number.isFinite(observed) && observed < ${Number(input.expected)}`
            : "Boolean(observed)"
    };
const verdict = passed ? ${JSON.stringify(EVALUATOR_VERDICT.SUPPORTS)} : ${JSON.stringify(EVALUATOR_VERDICT.CONTRADICTS)};
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

async function createWorkspace(): Promise<LabWorkspace> {
    const directory = await mkdtemp(path.join(tmpdir(), "lab-research-loop-"));
    const taskPath = path.join(directory, "task.json");
    await writeFile(
        taskPath,
        JSON.stringify({
            goal: "Find and independently reproduce a speedup",
            context: [],
            success_criteria: ["A clean verifier reproduces the result"]
        })
    );
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
