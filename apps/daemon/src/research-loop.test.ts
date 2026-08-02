import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
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
    ClaimStatus,
    EventType,
    EvidenceKind,
    ExperimentStatus,
    LabState
} from "@lab/protocol/constants";
import { describe, expect, it } from "vitest";
import { CRITIC_VERDICT, RESEARCH_OUTCOME, VERIFIER_VERDICT } from "#src/research-contract";
import { ResearchLoopOutcomeStatus, runResearchLoop } from "#src/research-loop";
import { ResearchStage } from "#src/research-workspace";
import { LabWorkspace } from "#src/workspace";

const PromptRole = {
    DIRECTOR: "Director of an autonomous research lab",
    RESEARCHER: "independent researcher",
    CRITIC: "adversarial critic",
    VERIFIER: "independent verifier"
} as const;

class ScriptedHarness implements AgentHarness {
    readonly kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE;
    readonly requests: HarnessRunRequest[] = [];
    readonly verifierInitialEntries: string[][] = [];

    constructor(kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE) {
        this.kind = kind;
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
                assumptions: [],
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
        } else if (request.prompt.includes(PromptRole.RESEARCHER)) {
            const artifactPath = path.join(request.cwd, `measurement-${this.requests.length}.json`);
            const evaluatorPath = path.join(request.cwd, `evaluate-${this.requests.length}.mjs`);
            await writeFile(artifactPath, JSON.stringify({ elapsed_ms: 12 }));
            await writeFile(evaluatorPath, "process.exit(0);\n");
            output = {
                summary: "A recorded benchmark supports the claim",
                hypothesis: "The candidate lowers elapsed time",
                outcome: RESEARCH_OUTCOME.SUPPORTED,
                evidence: [
                    {
                        claim_index: 0,
                        summary: "Recorded benchmark samples",
                        artifact_paths: [artifactPath],
                        contradicts_hypothesis: false,
                        evaluator_command: {
                            file: process.execPath,
                            args: [evaluatorPath]
                        }
                    }
                ],
                limitations: [],
                next_experiments: []
            };
        } else if (request.prompt.includes(PromptRole.CRITIC)) {
            output = {
                verdict: CRITIC_VERDICT.CREDIBLE,
                summary: "The result is ready for independent reproduction",
                issues: [],
                counterexamples: [],
                claims_to_verify: ["The candidate is faster"],
                next_experiments: []
            };
        } else if (request.prompt.includes(PromptRole.VERIFIER)) {
            this.verifierInitialEntries.push(await readdir(request.cwd));
            const artifactPath = path.join(request.cwd, "independent-reproduction.json");
            const evaluatorPath = path.join(request.cwd, "verify-speedup.mjs");
            await writeFile(artifactPath, JSON.stringify({ elapsed_ms: 11 }));
            await writeFile(evaluatorPath, "process.exit(0);\n");
            output = {
                verdict: VERIFIER_VERDICT.REPRODUCED,
                claim_index: 0,
                result_statement: "An independent benchmark reproduced the speedup",
                evaluator_command: {
                    file: process.execPath,
                    args: [evaluatorPath]
                },
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
    #failed = false;

    constructor(
        kind: typeof HarnessKinds.CODEX | typeof HarnessKinds.CLAUDE,
        promptMarker: string
    ) {
        super(kind);
        this.#promptMarker = promptMarker;
    }

    override async *run(request: HarnessRunRequest): AsyncIterable<HarnessEvent> {
        if (!this.#failed && request.prompt.includes(this.#promptMarker)) {
            this.#failed = true;
            this.requests.push(request);
            const result = await harnessResult(
                this.kind,
                request,
                undefined,
                HarnessRunStatuses.FAILED
            );
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
        expect([...codex.requests, ...claude.requests]).toHaveLength(5);
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
                EventType.CLAIM_SUPPORTED,
                EventType.VERIFIER_VERDICT_RECORDED,
                EventType.CLAIM_REPRODUCED,
                EventType.LAB_COMPLETED
            ])
        );
        await expect(
            readFile(path.join(workspace.runDirectory, "result.json"), "utf8")
        ).resolves.toContain("independent benchmark reproduced");
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
});

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
