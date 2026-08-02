import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { WakeTrigger } from "@lab/core/lab-lifecycle/wake-trigger.const";
import type {
    CommitRuntimeInput,
    CommitRuntimeResult,
    InitializeRuntimeInput,
    PersistedLabEvent,
    PersistedRuntime,
    RecoverableRuntime,
    RuntimeCheckpoint
} from "@lab/db/runtime/runtime-persistence.types";
import { EventType, EvidenceKind, LabState } from "@lab/protocol/constants";
import type { Evidence } from "@lab/protocol/schemas";
import { describe, expect, it } from "vitest";
import { validateFileArtifact } from "#src/artifact-integrity/file-artifact";
import { startDaemon } from "#src/daemon-runtime/daemon-startup";
import { ResearchLoopOutcomeStatus } from "#src/research-cycle/research-loop.const";

const TestDatabase = {
    URL: "postgres://test:test@127.0.0.1:5432/test"
} as const;

const AutomaticWakeScenario = {
    EVIDENCE: {
        label: "evidence",
        trigger: WakeTrigger.EVIDENCE
    },
    TOOL: {
        label: "tool",
        trigger: WakeTrigger.TOOL,
        resourceReference: "toolchain://codex/current"
    },
    DATASET: {
        label: "dataset",
        trigger: WakeTrigger.CAPABILITY,
        resourceReference: "dataset://independent/v1"
    }
} as const;

class InMemoryRuntimePersistence {
    #checkpoint: RuntimeCheckpoint | undefined;
    #task: InitializeRuntimeInput["task"] | undefined;
    #workspacePath: string | undefined;
    readonly #events: PersistedLabEvent[] = [];

    async initialize(input: InitializeRuntimeInput): Promise<CommitRuntimeResult> {
        if (this.#checkpoint !== undefined) {
            throw new Error(`Runtime ${input.snapshot.lab.id} is already initialized`);
        }
        this.#task = structuredClone(input.task);
        this.#workspacePath = input.workspacePath;
        return this.#store(input.snapshot, input.evidence ?? [], 1, input.event);
    }

    async load(labId: string): Promise<PersistedRuntime | undefined> {
        if (
            this.#checkpoint?.snapshot.lab.id !== labId ||
            this.#task === undefined ||
            this.#workspacePath === undefined
        ) {
            return undefined;
        }
        return {
            task: structuredClone(this.#task),
            workspacePath: this.#workspacePath,
            checkpoint: structuredClone(this.#checkpoint),
            persistedAt: this.#checkpoint.snapshot.lab.updated_at
        };
    }

    async commit(input: CommitRuntimeInput): Promise<CommitRuntimeResult> {
        if (this.#checkpoint?.revision !== input.expectedRevision) {
            throw new Error(`Unexpected runtime revision ${input.expectedRevision}`);
        }
        return this.#store(
            input.snapshot,
            input.evidence ?? this.#checkpoint.evidence,
            input.expectedRevision + 1,
            input.event
        );
    }

    async eventsAfter(labId: string, afterSequence = 0, limit = 200): Promise<PersistedLabEvent[]> {
        return structuredClone(
            this.#events
                .filter((event) => event.lab_id === labId && event.sequence > afterSequence)
                .slice(0, limit)
        );
    }

    async listRecoverable(): Promise<RecoverableRuntime[]> {
        if (
            this.#checkpoint === undefined ||
            this.#task === undefined ||
            this.#workspacePath === undefined ||
            (this.#checkpoint.snapshot.lab.state !== LabState.RUNNING &&
                this.#checkpoint.snapshot.lab.state !== LabState.HIBERNATING)
        ) {
            return [];
        }
        return [
            {
                task: structuredClone(this.#task),
                workspacePath: this.#workspacePath,
                checkpoint: structuredClone(this.#checkpoint),
                persistedAt: this.#checkpoint.snapshot.lab.updated_at
            }
        ];
    }

    #store(
        snapshot: RuntimeCheckpoint["snapshot"],
        evidence: readonly Evidence[],
        revision: number,
        event?: InitializeRuntimeInput["event"]
    ): CommitRuntimeResult {
        const appendedEvent =
            event === undefined ? undefined : { ...event, sequence: this.#events.length + 1 };
        if (appendedEvent !== undefined) {
            this.#events.push(appendedEvent);
        }
        const checkpoint: RuntimeCheckpoint = {
            snapshot: structuredClone(snapshot),
            evidence: [...structuredClone(evidence)],
            revision,
            ...(appendedEvent === undefined ? {} : { lastEventSequence: appendedEvent.sequence })
        };
        this.#checkpoint = checkpoint;
        return {
            ...structuredClone(checkpoint),
            ...(appendedEvent === undefined ? {} : { appendedEvent })
        };
    }
}

describe("daemon startup", () => {
    it.each(Object.values(AutomaticWakeScenario))(
        "starts research exactly once after a committed $label wake transition",
        async (scenario) => {
            const directory = await mkdtemp(path.join(tmpdir(), "lab-daemon-trigger-test-"));
            const taskPath = path.join(directory, "task.json");
            const workspaceRoot = path.join(directory, "workspace");
            await writeFile(taskPath, JSON.stringify({ goal: "Resume autonomous research" }));
            let runs = 0;
            let markFirstRunReady: () => void = () => undefined;
            const firstRunReady = new Promise<void>((resolveReady) => {
                markFirstRunReady = resolveReady;
            });
            const daemon = await startDaemon(
                { taskPath, workspaceRoot, port: 0, databaseUrl: TestDatabase.URL },
                {
                    openDatabase: async () => ({
                        persistence: new InMemoryRuntimePersistence(),
                        close: async () => undefined
                    }),
                    researchLoop: async (workspace, { signal }) => {
                        runs += 1;
                        if (runs === 1) {
                            const reason = "Test plateau";
                            await workspace.hibernateForPlateau(reason);
                            await new Promise<void>((resolveWake) => {
                                const unsubscribe = workspace.subscribe((event, snapshot) => {
                                    if (
                                        event.type === EventType.LAB_STATE_CHANGED &&
                                        snapshot.lab.state === LabState.RUNNING
                                    ) {
                                        unsubscribe();
                                        resolveWake();
                                    }
                                });
                                signal?.addEventListener(
                                    "abort",
                                    () => {
                                        unsubscribe();
                                        resolveWake();
                                    },
                                    { once: true }
                                );
                                markFirstRunReady();
                            });
                            if (signal?.aborted === true) {
                                return { status: ResearchLoopOutcomeStatus.CANCELLED };
                            }
                            return { status: ResearchLoopOutcomeStatus.HIBERNATING, reason };
                        }
                        return { status: ResearchLoopOutcomeStatus.CANCELLED };
                    }
                }
            );

            try {
                await firstRunReady;
                expect(daemon.workspace.getSnapshot().lab.state).toBe(LabState.HIBERNATING);

                if ("resourceReference" in scenario) {
                    const request = await daemon.workspace.requestCapability({
                        need: `${scenario.label} resource`,
                        reason: "The research loop requires an operator-provided resource",
                        provisioningHint: "Provide an opaque resource handle"
                    });
                    const response = await daemon.app.inject({
                        method: "POST",
                        url: `/api/capabilities/${request.id}/provide`,
                        payload: { resource_reference: scenario.resourceReference }
                    });
                    expect(response.statusCode).toBe(202);
                } else {
                    const artifactPath = path.join(
                        daemon.workspace.runDirectory,
                        "daemon-wake-evidence.txt"
                    );
                    await writeFile(artifactPath, "New durable evidence is available");
                    const artifact = await validateFileArtifact(
                        daemon.workspace.runDirectory,
                        artifactPath
                    );
                    await daemon.workspace.recordEvidence({
                        id: "evidence-daemon-wake",
                        kind: EvidenceKind.ARTIFACT,
                        claim_id: "claim-daemon-wake",
                        artifact_path: artifact.path,
                        artifact_hash: artifact.sha256,
                        summary: "New durable evidence is available",
                        supports: true,
                        independent: true,
                        created_at: new Date().toISOString()
                    });
                }

                expect(daemon.workspace.getSnapshot().lab.state).toBe(LabState.RUNNING);
                expect(
                    daemon.workspace
                        .getEvents()
                        .findLast(
                            (event) =>
                                event.type === EventType.LAB_STATE_CHANGED &&
                                event.payload.state === LabState.RUNNING
                        )?.payload
                ).toMatchObject({ wake_trigger: scenario.trigger });
                await expect.poll(() => runs).toBe(2);
                await new Promise<void>((resolveTurn) => setImmediate(resolveTurn));
                expect(runs).toBe(2);
            } finally {
                await daemon.close();
            }
        }
    );

    it("unsubscribes the research controller when the daemon closes", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-daemon-close-test-"));
        const taskPath = path.join(directory, "task.json");
        const workspaceRoot = path.join(directory, "workspace");
        await writeFile(taskPath, JSON.stringify({ goal: "Close lifecycle listeners" }));
        let runs = 0;
        const daemon = await startDaemon(
            { taskPath, workspaceRoot, port: 0, databaseUrl: TestDatabase.URL },
            {
                openDatabase: async () => ({
                    persistence: new InMemoryRuntimePersistence(),
                    close: async () => undefined
                }),
                researchLoop: async () => {
                    runs += 1;
                    return { status: ResearchLoopOutcomeStatus.CANCELLED };
                }
            }
        );
        await expect.poll(() => runs).toBe(1);

        await daemon.close();
        const artifactPath = path.join(daemon.workspace.runDirectory, "after-close-evidence.txt");
        await writeFile(artifactPath, "Evidence committed after transport shutdown");
        const artifact = await validateFileArtifact(daemon.workspace.runDirectory, artifactPath);
        await daemon.workspace.hibernateForPlateau("Test listener cleanup");
        await daemon.workspace.recordEvidence({
            id: "evidence-after-close",
            kind: EvidenceKind.ARTIFACT,
            claim_id: "claim-after-close",
            artifact_path: artifact.path,
            artifact_hash: artifact.sha256,
            summary: "Evidence committed after transport shutdown",
            supports: true,
            independent: true,
            created_at: new Date().toISOString()
        });
        await new Promise<void>((resolveTurn) => setImmediate(resolveTurn));

        expect(daemon.workspace.getSnapshot().lab.state).toBe(LabState.RUNNING);
        expect(runs).toBe(1);
    });
});
