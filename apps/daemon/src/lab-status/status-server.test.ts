import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { describe, expect, it } from "vitest";
import { createStatusServer } from "#src/lab-status/status-server";
import { LabWorkspace } from "#src/lab-workspace/lab-workspace";

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

    it("handles a repeated answer idempotently and a changed one as a conflict", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-capability-route-test-"));
        const taskPath = path.join(directory, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Resume with a capability" }));
        const workspace = await LabWorkspace.initialize(directory, taskPath);
        const request = await workspace.requestCapability({
            need: "Independent dataset",
            reason: "The verifier needs independent observations",
            provisioningHint: "Mount the dataset in the run workspace",
            selfProvisioningAttempt:
                "Rebuilt it from public mirrors, which overlap the training set",
            blocking: true
        });
        const server = createStatusServer(workspace);
        const answer = "No. Report the overlap and carry the limitation instead.";

        const first = await server.inject({
            method: "POST",
            url: `/api/capabilities/${request.id}/answer`,
            payload: { answer }
        });
        const retry = await server.inject({
            method: "POST",
            url: `/api/capabilities/${request.id}/answer`,
            payload: { answer }
        });
        const conflict = await server.inject({
            method: "POST",
            url: `/api/capabilities/${request.id}/answer`,
            payload: { answer: "Changed my mind, mounted at /srv/corpora/independent-v1" }
        });

        expect(first.statusCode).toBe(202);
        expect(retry.statusCode).toBe(202);
        expect(conflict.statusCode).toBe(409);
        expect(
            workspace.getSnapshot().capability_requests.find(({ id }) => id === request.id)
        ).toMatchObject({ status: CapabilityStatus.ANSWERED, answer });
        expect(
            workspace.getEvents().filter(({ type }) => type === EventType.CAPABILITY_ANSWERED)
        ).toHaveLength(1);
        await server.close();
    });

    it("returns 400 for an empty answer without settling the request", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-capability-empty-route-test-"));
        const taskPath = path.join(directory, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Answer a capability request" }));
        const workspace = await LabWorkspace.initialize(directory, taskPath);
        const request = await workspace.requestCapability({
            need: "Licensed dataset",
            reason: "The verifier needs licensed observations",
            provisioningHint: "Point the run at a local copy",
            selfProvisioningAttempt: "Checked the open mirrors and none carry the licensed split",
            blocking: true
        });
        const server = createStatusServer(workspace);

        const response = await server.inject({
            method: "POST",
            url: `/api/capabilities/${request.id}/answer`,
            payload: { answer: "   " }
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({ error: "A capability answer must not be empty" });
        expect(
            workspace.getSnapshot().capability_requests.find(({ id }) => id === request.id)
        ).toMatchObject({ status: CapabilityStatus.OPEN });
        expect(workspace.getEvents().map(({ type }) => type)).not.toContain(
            EventType.CAPABILITY_ANSWERED
        );
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
                "assumptions.json",
                "events.json",
                "status.json",
                "task.json"
            ])
        );
        await server.close();
    });
});
