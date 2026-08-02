import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { describe, expect, it } from "vitest";
import { createStatusServer } from "#src/lab-status/status-server";
import { LabWorkspace } from "#src/lab-workspace/lab-workspace";

const UnsafeCapabilityReference = {
    OPENAI_KEY: "sk-proj-abcdefghijklmnopqrstuvwxyz012345",
    BEARER_TOKEN: "Bearer abcdefghijklmnopqrstuvwxyz012345",
    LONG_TOKEN: "a".repeat(96),
    API_KEY_PLAINTEXT: "api-key: abcdefghijklmnopqrstuvwxyz"
} as const;

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

    it("handles idempotently provided capabilities", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-capability-route-test-"));
        const taskPath = path.join(directory, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Resume with a capability" }));
        const workspace = await LabWorkspace.initialize(directory, taskPath);
        const request = await workspace.requestCapability({
            need: "Independent dataset",
            reason: "The verifier needs independent observations",
            provisioningHint: "Mount the dataset in the run workspace"
        });
        const server = createStatusServer(workspace);

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
        expect(
            workspace.getSnapshot().capability_requests.find(({ id }) => id === request.id)
        ).toMatchObject({
            status: CapabilityStatus.PROVIDED,
            resource_reference: "dataset://independent/v1"
        });
        expect(
            workspace.getEvents().filter(({ type }) => type === EventType.CAPABILITY_PROVIDED)
        ).toHaveLength(1);
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
});
