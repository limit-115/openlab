import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
    CommitRuntimeInput,
    CommitRuntimeResult,
    InitializeRuntimeInput,
    PersistedLabEvent,
    PersistedRuntime,
    RecoverableRuntime,
    RuntimeCheckpoint
} from "@lab/db/runtime";
import { CapabilityStatus, EventType, LabState } from "@lab/protocol/constants";
import type { Evidence } from "@lab/protocol/schemas";
import { describe, expect, it } from "vitest";
import { ResearchLoopOutcomeStatus } from "#src/research-loop";
import { createStatusServer, startDaemon } from "#src/server";
import { LabWorkspace } from "#src/workspace";

const TestDatabase = {
    URL: "postgres://test:test@127.0.0.1:5432/test"
} as const;

const UnsafeCapabilityReference = {
    OPENAI_KEY: "sk-proj-abcdefghijklmnopqrstuvwxyz012345",
    BEARER_TOKEN: "Bearer abcdefghijklmnopqrstuvwxyz012345",
    LONG_TOKEN: "a".repeat(96),
    API_KEY_PLAINTEXT: "api-key: abcdefghijklmnopqrstuvwxyz"
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

async function createTestServer() {
    const directory = await mkdtemp(path.join(tmpdir(), "lab-server-test-"));
    const taskPath = path.join(directory, "task.json");
    await writeFile(taskPath, JSON.stringify({ goal: "Inspect the API" }));
    const workspace = await LabWorkspace.initialize(directory, taskPath);
    return createStatusServer(workspace);
}

describe("status server", () => {
    it("returns a validated snapshot", async () => {
        const server = await createTestServer();
        const response = await server.inject({ method: "GET", url: "/api/status" });

        expect(response.statusCode).toBe(200);
        expect(response.json().lab.goal).toBe("Inspect the API");
        await server.close();
    });

    it("rejects waking a running lab", async () => {
        const server = await createTestServer();
        const response = await server.inject({ method: "POST", url: "/api/wake" });

        expect(response.statusCode).toBe(409);
        await server.close();
    });

    it("schedules research once for an idempotently provided capability", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-capability-route-test-"));
        const taskPath = path.join(directory, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Resume with a capability" }));
        const workspace = await LabWorkspace.initialize(directory, taskPath);
        const request = await workspace.requestCapability({
            need: "Independent dataset",
            reason: "The verifier needs independent observations",
            provisioningHint: "Mount the dataset in the run workspace"
        });
        let wakeCount = 0;
        const server = createStatusServer(workspace, {
            onWake: () => {
                wakeCount += 1;
            }
        });

        const first = await server.inject({
            method: "POST",
            url: `/api/capabilities/${request.id}/provide`,
            payload: { resource_reference: "dataset://independent/v1" }
        });
        const retry = await server.inject({
            method: "POST",
            url: `/api/capabilities/${request.id}/provide`,
            payload: { resource_reference: "dataset://independent/v1" }
        });
        const conflict = await server.inject({
            method: "POST",
            url: `/api/capabilities/${request.id}/provide`,
            payload: { resource_reference: "dataset://independent/v2" }
        });

        expect(first.statusCode).toBe(202);
        expect(retry.statusCode).toBe(202);
        expect(conflict.statusCode).toBe(409);
        expect(wakeCount).toBe(1);
        expect(
            workspace.getSnapshot().capability_requests.find(({ id }) => id === request.id)
        ).toMatchObject({
            status: CapabilityStatus.PROVIDED,
            resource_reference: "dataset://independent/v1"
        });
        await server.close();
    });

    it("returns 400 for credential payloads without persisting or publishing them", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-capability-secret-route-test-"));
        const taskPath = path.join(directory, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Use an opaque capability handle" }));
        const workspace = await LabWorkspace.initialize(directory, taskPath);
        const request = await workspace.requestCapability({
            need: "Licensed dataset",
            reason: "The verifier needs licensed observations",
            provisioningHint: "Provide a dataset or keychain reference"
        });
        const server = createStatusServer(workspace);

        for (const reference of Object.values(UnsafeCapabilityReference)) {
            const response = await server.inject({
                method: "POST",
                url: `/api/capabilities/${request.id}/provide`,
                payload: { resource_reference: reference }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({ error: "Invalid capability resource reference" });
        }

        expect(
            workspace.getSnapshot().capability_requests.find(({ id }) => id === request.id)
        ).toMatchObject({ status: CapabilityStatus.OPEN });
        expect(workspace.getEvents().map(({ type }) => type)).not.toContain(
            EventType.CAPABILITY_PROVIDED
        );
        const persistedState = JSON.stringify({
            snapshot: workspace.getSnapshot(),
            events: workspace.getEvents()
        });
        for (const reference of Object.values(UnsafeCapabilityReference)) {
            expect(persistedState).not.toContain(reference);
        }
        await server.close();
    });

    it("serves the built dashboard when provided", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-dashboard-test-"));
        const taskPath = path.join(directory, "task.json");
        const dashboardRoot = path.join(directory, "dashboard");
        await mkdir(dashboardRoot);
        await Promise.all([
            writeFile(taskPath, JSON.stringify({ goal: "Observe the lab" })),
            writeFile(path.join(dashboardRoot, "index.html"), "<main>dashboard</main>")
        ]);
        const workspace = await LabWorkspace.initialize(directory, taskPath);
        const server = createStatusServer(workspace, { dashboardRoot });

        const response = await server.inject({ method: "GET", url: "/claims/claim-1" });

        expect(response.statusCode).toBe(200);
        expect(response.body).toContain("dashboard");
        await server.close();
    });

    it("exports every durable run file using portable relative paths", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-export-test-"));
        const taskPath = path.join(directory, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Export every artifact" }));
        const workspace = await LabWorkspace.initialize(directory, taskPath);
        const artifactDirectory = path.join(workspace.runDirectory, "artifacts", "experiment-1");
        await mkdir(artifactDirectory, { recursive: true });
        await writeFile(path.join(artifactDirectory, "metrics.json"), JSON.stringify({ score: 1 }));
        const server = createStatusServer(workspace);

        const response = await server.inject({ method: "GET", url: "/api/export" });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            lab_id: workspace.labId,
            run_directory: workspace.runDirectory
        });
        expect(response.json().files).toEqual(
            expect.arrayContaining([
                "artifacts/experiment-1/metrics.json",
                "claims.json",
                "events.json",
                "evidence.json",
                "experiments.json",
                "status.json",
                "task.json"
            ])
        );
        await server.close();
    });

    it("restarts background research after waking a hibernating run", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-daemon-research-test-"));
        const taskPath = path.join(directory, "task.json");
        const workspaceRoot = path.join(directory, "workspace");
        await writeFile(taskPath, JSON.stringify({ goal: "Resume autonomous research" }));
        let runs = 0;
        let secondRunCancelled = false;
        let databaseClosed = false;
        let releaseFirstRun: () => void = () => undefined;
        const firstRunReleased = new Promise<void>((resolve) => {
            releaseFirstRun = resolve;
        });
        const daemon = await startDaemon(
            { taskPath, workspaceRoot, port: 0, databaseUrl: TestDatabase.URL },
            {
                openDatabase: async () => ({
                    persistence: new InMemoryRuntimePersistence(),
                    close: async () => {
                        databaseClosed = true;
                    }
                }),
                researchLoop: async (workspace, { signal }) => {
                    runs += 1;
                    if (runs === 1) {
                        const reason = "Test plateau";
                        await workspace.hibernateForPlateau(reason);
                        await firstRunReleased;
                        return { status: ResearchLoopOutcomeStatus.HIBERNATING, reason };
                    }
                    await new Promise<void>((resolve) => {
                        signal?.addEventListener(
                            "abort",
                            () => {
                                secondRunCancelled = true;
                                resolve();
                            },
                            { once: true }
                        );
                    });
                    return { status: ResearchLoopOutcomeStatus.CANCELLED };
                }
            }
        );
        await expect
            .poll(() => daemon.workspace.getSnapshot().lab.state)
            .toBe(LabState.HIBERNATING);

        const response = await daemon.app.inject({ method: "POST", url: "/api/wake" });

        expect(response.statusCode).toBe(200);
        expect(runs).toBe(1);
        releaseFirstRun();
        await expect.poll(() => runs).toBe(2);
        await daemon.close();
        expect(secondRunCancelled).toBe(true);
        expect(databaseClosed).toBe(true);
    });
});
