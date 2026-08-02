import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { WakeTrigger } from "@lab/core/lab-lifecycle/wake-trigger.const";
import type { RecoverableRuntime } from "@lab/db/runtime/runtime-persistence.types";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
import { afterEach, describe, expect, it } from "vitest";
import { validateFileArtifact } from "#src/artifact-integrity/file-artifact";
import { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import type { WorkspaceRuntimePersistence } from "#src/lab-workspace/lab-workspace.types";

const directories: string[] = [];

const SafeCapabilityReference = {
    DATASET: "dataset://independent/v1",
    TOOLCHAIN: "toolchain://codex/current",
    KEYCHAIN: "keychain://ai-research-lab/licensed-corpus",
    FILE: "file:///tmp/licensed-corpus"
} as const;

const AutomaticWakeCapability = [
    {
        label: "toolchain",
        reference: SafeCapabilityReference.TOOLCHAIN,
        trigger: WakeTrigger.TOOL
    },
    {
        label: "dataset",
        reference: SafeCapabilityReference.DATASET,
        trigger: WakeTrigger.CAPABILITY
    }
] as const;

const UnsafeCapabilityReference = {
    OPENAI_KEY: "sk-proj-abcdefghijklmnopqrstuvwxyz012345",
    BEARER_TOKEN: "Bearer abcdefghijklmnopqrstuvwxyz012345",
    LONG_TOKEN: "a".repeat(96),
    API_KEY_PLAINTEXT: "api-key: abcdefghijklmnopqrstuvwxyz"
} as const;

afterEach(() => {
    directories.length = 0;
});

async function createWorkspace(): Promise<LabWorkspace> {
    const directory = await mkdtemp(path.join(tmpdir(), "lab-workspace-test-"));
    directories.push(directory);
    const taskPath = path.join(directory, "task.json");
    await writeFile(taskPath, JSON.stringify({ goal: "Test a research claim" }));
    return LabWorkspace.initialize(directory, taskPath);
}

describe("LabWorkspace", () => {
    it("creates canonical protocol snapshots", async () => {
        const workspace = await createWorkspace();

        expect(workspace.getSnapshot().lab.state).toBe(LabState.RUNNING);
        const claims = JSON.parse(
            await readFile(path.join(workspace.runDirectory, "claims.json"), "utf8")
        );
        expect(claims).toEqual([]);
    });

    it("persists and publishes state transitions", async () => {
        const workspace = await createWorkspace();
        const observed: string[] = [];
        workspace.subscribe((event) => observed.push(event.type));

        await workspace.transition(LabState.STOPPED, "test");

        expect(workspace.getSnapshot().lab.state).toBe(LabState.STOPPED);
        expect(observed).toContain(EventType.LAB_STATE_CHANGED);
    });

    it("recovers an unfinished run for the same task", async () => {
        const workspace = await createWorkspace();
        const taskPath = path.join(path.dirname(path.dirname(workspace.runDirectory)), "task.json");
        const recovered = await LabWorkspace.openOrCreate(
            path.dirname(path.dirname(workspace.runDirectory)),
            taskPath
        );

        expect(recovered.labId).toBe(workspace.labId);
        expect(recovered.recovered).toBe(true);
    });

    it("selects the latest matching database runtime when the pointer is corrupt", async () => {
        const workspace = await createWorkspace();
        const workspaceRoot = path.dirname(path.dirname(workspace.runDirectory));
        const taskPath = path.join(workspaceRoot, "task.json");
        const task = await workspace.getTask();
        const older = makeRecoverableRuntime(
            task,
            workspace.getSnapshot(),
            workspace.runDirectory,
            "2026-08-02T00:00:00.000Z"
        );
        const latest = makeRecoverableRuntime(
            task,
            workspace.getSnapshot(),
            path.join(workspaceRoot, "runs", "lab-latest"),
            "2026-08-02T00:01:00.000Z",
            "lab-latest"
        );
        await writeFile(path.join(workspaceRoot, "current.json"), "{corrupt");

        const recovered = await LabWorkspace.openOrCreate(
            workspaceRoot,
            taskPath,
            recoveryOnlyPersistence([older, latest])
        );

        expect(recovered.labId).toBe("lab-latest");
        expect(recovered.runDirectory).toBe(latest.workspacePath);
    });

    it("rejects a matching database runtime outside LAB_HOME", async () => {
        const workspace = await createWorkspace();
        const workspaceRoot = path.dirname(path.dirname(workspace.runDirectory));
        const taskPath = path.join(workspaceRoot, "task.json");
        const task = await workspace.getTask();
        const escaped = makeRecoverableRuntime(
            task,
            workspace.getSnapshot(),
            path.join(workspaceRoot, "..", "escaped-run"),
            "2026-08-02T00:00:00.000Z"
        );
        await writeFile(path.join(workspaceRoot, "current.json"), "{corrupt");

        await expect(
            LabWorkspace.openOrCreate(workspaceRoot, taskPath, recoveryOnlyPersistence([escaped]))
        ).rejects.toThrow("escapes LAB_HOME");
    });

    it("rejects a recoverable task whose reused id has different input", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-workspace-task-mismatch-"));
        const taskPath = path.join(directory, "task.json");
        const requestedTask = {
            id: "task-stable-id",
            goal: "Requested goal",
            context: [],
            success_criteria: []
        };
        await writeFile(taskPath, JSON.stringify(requestedTask));
        const workspace = await LabWorkspace.initialize(directory, taskPath);
        const storedTask = { ...requestedTask, goal: "Different stored goal" };
        const snapshot = workspace.getSnapshot();
        snapshot.lab.goal = storedTask.goal;
        const mismatched = makeRecoverableRuntime(
            storedTask,
            snapshot,
            workspace.runDirectory,
            "2026-08-02T00:00:00.000Z"
        );
        await writeFile(path.join(directory, "current.json"), "{corrupt");

        await expect(
            LabWorkspace.openOrCreate(directory, taskPath, recoveryOnlyPersistence([mismatched]))
        ).rejects.toThrow("does not match the requested task input");
    });

    it("rejects recoverable runtimes tied for the latest checkpoint", async () => {
        const workspace = await createWorkspace();
        const workspaceRoot = path.dirname(path.dirname(workspace.runDirectory));
        const taskPath = path.join(workspaceRoot, "task.json");
        const task = await workspace.getTask();
        const first = makeRecoverableRuntime(
            task,
            workspace.getSnapshot(),
            workspace.runDirectory,
            "2026-08-02T00:00:00.000Z"
        );
        const second = makeRecoverableRuntime(
            task,
            workspace.getSnapshot(),
            path.join(workspaceRoot, "runs", "lab-tied"),
            first.persistedAt,
            "lab-tied"
        );
        await writeFile(path.join(workspaceRoot, "current.json"), "{corrupt");

        await expect(
            LabWorkspace.openOrCreate(
                workspaceRoot,
                taskPath,
                recoveryOnlyPersistence([first, second])
            )
        ).rejects.toThrow("share the latest checkpoint timestamp");
    });

    it("deduplicates open capability requests", async () => {
        const workspace = await createWorkspace();
        const input = {
            need: "Claude subscription login",
            reason: "No authenticated research harness is available",
            provisioningHint: "Run claude and sign in with claude.ai"
        };

        const first = await workspace.requestCapability(input);
        const second = await workspace.requestCapability(input);

        expect(second.id).toBe(first.id);
        expect(workspace.getSnapshot().capability_requests).toHaveLength(1);
        expect(workspace.getSnapshot().frontier.blockers).toContain(input.need);
    });

    it("persists a provided capability, clears its blocker, and handles retries safely", async () => {
        const workspace = await createWorkspace();
        const request = await workspace.requestCapability({
            need: "Independent dataset",
            reason: "The verifier needs independent observations",
            provisioningHint: "Mount the dataset in the run workspace"
        });
        await workspace.hibernateForPlateau("Waiting for the independent dataset");

        await expect(
            workspace.provideCapability(request.id, " dataset://independent/v1 ")
        ).resolves.toBe(true);
        const provided = workspace
            .getSnapshot()
            .capability_requests.find(({ id }) => id === request.id);
        expect(provided).toMatchObject({
            status: CapabilityStatus.PROVIDED,
            resource_reference: "dataset://independent/v1"
        });
        expect(provided?.provided_at).toBeDefined();
        expect(workspace.getSnapshot().frontier.blockers).not.toContain(request.need);
        expect(workspace.getSnapshot().lab.state).toBe(LabState.RUNNING);

        await expect(
            workspace.provideCapability(request.id, "dataset://independent/v1")
        ).resolves.toBe(true);
        await expect(workspace.provideCapability(request.id, "dataset://different")).resolves.toBe(
            false
        );
        expect(
            workspace.getEvents().filter(({ type }) => type === EventType.CAPABILITY_PROVIDED)
        ).toHaveLength(1);
    });

    it.each(AutomaticWakeCapability)(
        "wakes a hibernating lab with the exact $label trigger",
        async ({ reference, trigger }) => {
            const workspace = await createWorkspace();
            const request = await workspace.requestCapability({
                need: `${reference} resource`,
                reason: "The research branch is blocked on an operator-provided resource",
                provisioningHint: "Provide an opaque resource handle"
            });
            await workspace.hibernateForPlateau("Waiting for a capability");

            await expect(workspace.provideCapability(request.id, reference)).resolves.toBe(true);

            expect(workspace.getSnapshot().lab.state).toBe(LabState.RUNNING);
            expect(
                workspace
                    .getEvents()
                    .findLast(
                        (event) =>
                            event.type === EventType.LAB_STATE_CHANGED &&
                            event.payload.state === LabState.RUNNING
                    )?.payload
            ).toMatchObject({ wake_trigger: trigger });
        }
    );

    it("accepts safe dataset, keychain, and file resource handles", async () => {
        const workspace = await createWorkspace();

        for (const [kind, reference] of Object.entries(SafeCapabilityReference)) {
            const request = await workspace.requestCapability({
                need: `${kind} resource`,
                reason: "The research branch needs an operator-provided resource",
                provisioningHint: "Provide only an opaque resource handle"
            });

            await expect(workspace.provideCapability(request.id, reference)).resolves.toBe(true);
            expect(
                workspace.getSnapshot().capability_requests.find(({ id }) => id === request.id)
                    ?.resource_reference
            ).toBe(reference);
        }

        expect(
            workspace.getEvents().filter(({ type }) => type === EventType.CAPABILITY_PROVIDED)
        ).toHaveLength(Object.values(SafeCapabilityReference).length);
    });

    it("rejects raw credential payloads before persisting or emitting an event", async () => {
        const workspace = await createWorkspace();
        const request = await workspace.requestCapability({
            need: "Restricted dataset access",
            reason: "The research branch needs licensed observations",
            provisioningHint: "Provide a keychain or dataset handle"
        });

        for (const reference of Object.values(UnsafeCapabilityReference)) {
            await expect(workspace.provideCapability(request.id, reference)).rejects.toThrow();
        }

        const unchangedRequest = workspace
            .getSnapshot()
            .capability_requests.find(({ id }) => id === request.id);
        expect(unchangedRequest?.status).toBe(CapabilityStatus.OPEN);
        expect(unchangedRequest).not.toHaveProperty("resource_reference");
        expect(unchangedRequest).not.toHaveProperty("provided_at");
        expect(workspace.getEvents().map(({ type }) => type)).not.toContain(
            EventType.CAPABILITY_PROVIDED
        );
        const persistedState = JSON.stringify({
            snapshot: workspace.getSnapshot(),
            events: workspace.getEvents()
        });
        const persistedFiles = await Promise.all([
            readFile(path.join(workspace.runDirectory, "status.json"), "utf8"),
            readFile(path.join(workspace.runDirectory, "events.json"), "utf8")
        ]);
        for (const reference of Object.values(UnsafeCapabilityReference)) {
            expect(persistedState).not.toContain(reference);
            expect(persistedFiles).not.toContainEqual(expect.stringContaining(reference));
        }
    });

    it("rejects capability resources for requests that are not open", async () => {
        const workspace = await createWorkspace();
        const request = await workspace.requestCapability({
            need: "Restricted corpus",
            reason: "The experiment requires licensed inputs",
            provisioningHint: "Provide a licensed local corpus"
        });
        await workspace.update((draft) => {
            const obsolete = draft.capability_requests.find(({ id }) => id === request.id);
            if (obsolete !== undefined) {
                obsolete.status = CapabilityStatus.OBSOLETE;
            }
        });

        await expect(
            workspace.provideCapability(request.id, "dataset://restricted/v1")
        ).resolves.toBe(false);
        await expect(workspace.provideCapability(request.id, "   ")).rejects.toThrow(
            "must not be empty"
        );
    });

    it("writes a report before hibernating on a plateau", async () => {
        const workspace = await createWorkspace();
        await workspace.update((draft) => {
            draft.frontier.blockers = ["Independent dataset is unavailable"];
            draft.frontier.next_experiments = ["Acquire an independent dataset"];
        });

        await workspace.hibernateForPlateau("No informative experiments remain");

        expect(workspace.getSnapshot().lab.state).toBe(LabState.HIBERNATING);
        const report = await readFile(path.join(workspace.runDirectory, "report.md"), "utf8");
        expect(report).toContain("Plateau report");
        expect(report).toContain("## Evidence");
        expect(report).toContain("Independent dataset is unavailable");
        expect(report).toContain("Acquire an independent dataset");
    });

    it("refuses completion without supporting evidence", async () => {
        const workspace = await createWorkspace();

        await expect(
            workspace.complete({
                summary: "A result",
                supportingEvidenceIds: [],
                independentVerifierVerdictId: "verdict-1",
                limitations: [],
                knownCounterexamples: []
            })
        ).rejects.toThrow("supporting evidence");
    });

    it("persists only hashed artifacts contained by the run workspace", async () => {
        const workspace = await createWorkspace();
        const artifactPath = path.join(workspace.runDirectory, "measurement.json");
        await writeFile(artifactPath, JSON.stringify({ elapsed_ms: 12 }));
        const artifact = await validateFileArtifact(workspace.runDirectory, artifactPath);

        await workspace.recordEvidence({
            id: "evidence-measurement",
            kind: EvidenceKind.ARTIFACT,
            claim_id: "claim-speed",
            artifact_path: artifact.path,
            artifact_hash: artifact.sha256,
            summary: "Measured elapsed time",
            supports: true,
            independent: false,
            created_at: new Date().toISOString()
        });

        const persisted = JSON.parse(
            await readFile(path.join(workspace.runDirectory, "evidence.json"), "utf8")
        );
        expect(persisted).toHaveLength(1);
        expect(workspace.inspect("evidence-measurement")).toMatchObject({
            artifact_hash: artifact.sha256
        });
    });

    it("wakes a hibernating lab after committing valid evidence", async () => {
        const workspace = await createWorkspace();
        const artifactPath = path.join(workspace.runDirectory, "new-source.txt");
        await writeFile(artifactPath, "Independent material evidence");
        const artifact = await validateFileArtifact(workspace.runDirectory, artifactPath);
        await workspace.hibernateForPlateau("Waiting for new evidence");

        await workspace.recordEvidence({
            id: "evidence-new-source",
            kind: EvidenceKind.ARTIFACT,
            claim_id: "claim-new-source",
            artifact_path: artifact.path,
            artifact_hash: artifact.sha256,
            summary: "An independent source became available",
            supports: true,
            independent: true,
            created_at: new Date().toISOString()
        });

        expect(workspace.getSnapshot().lab.state).toBe(LabState.RUNNING);
        expect(
            workspace
                .getEvents()
                .findLast(
                    (event) =>
                        event.type === EventType.LAB_STATE_CHANGED &&
                        event.payload.state === LabState.RUNNING
                )?.payload
        ).toMatchObject({ wake_trigger: WakeTrigger.EVIDENCE });
        await expect(
            readFile(path.join(workspace.runDirectory, "evidence.json"), "utf8")
        ).resolves.toContain("evidence-new-source");
    });

    it("rejects evidence artifacts outside the isolated run workspace without waking", async () => {
        const workspace = await createWorkspace();
        const externalPath = path.join(path.dirname(workspace.runDirectory), "external.txt");
        await writeFile(externalPath, "not contained");
        const artifact = await validateFileArtifact(
            path.dirname(workspace.runDirectory),
            externalPath
        );
        await workspace.hibernateForPlateau("Waiting for valid evidence");
        const eventsBefore = workspace.getEvents();

        await expect(
            workspace.recordEvidence({
                id: "evidence-external",
                kind: EvidenceKind.ARTIFACT,
                claim_id: "claim-speed",
                artifact_path: artifact.path,
                artifact_hash: artifact.sha256,
                summary: "External result",
                supports: true,
                independent: false,
                created_at: new Date().toISOString()
            })
        ).rejects.toThrow("escapes its isolated workspace");
        expect(workspace.getSnapshot().lab.state).toBe(LabState.HIBERNATING);
        expect(workspace.getEvents()).toEqual(eventsBefore);
    });

    it("rejects fabricated completion evidence ids", async () => {
        const workspace = await createWorkspace();

        await expect(
            workspace.complete({
                summary: "A fabricated result",
                supportingEvidenceIds: ["evidence-missing"],
                independentVerifierVerdictId: "evidence-missing",
                limitations: [],
                knownCounterexamples: []
            })
        ).rejects.toThrow("unknown evidence");
    });
});

function makeRecoverableRuntime(
    task: TaskInput,
    sourceSnapshot: StatusSnapshot,
    workspacePath: string,
    persistedAt: string,
    labId: string = sourceSnapshot.lab.id
): RecoverableRuntime {
    const snapshot = structuredClone(sourceSnapshot);
    snapshot.lab.id = labId;
    return {
        task: structuredClone(task),
        workspacePath,
        checkpoint: { snapshot, evidence: [], revision: 1 },
        persistedAt
    };
}

function recoveryOnlyPersistence(
    recoverable: readonly RecoverableRuntime[]
): WorkspaceRuntimePersistence {
    return {
        initialize: async () => {
            throw new Error("Unexpected runtime initialization");
        },
        load: async () => undefined,
        commit: async () => {
            throw new Error("Unexpected runtime commit");
        },
        eventsAfter: async () => [],
        listRecoverable: async () => [...structuredClone(recoverable)]
    };
}
