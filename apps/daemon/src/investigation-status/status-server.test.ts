import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { SubscriptionAllowanceRosterSchema } from "@lab/protocol/subscription-allowance/subscription-allowance.schema";
import { describe, expect, it } from "vitest";
import { createStatusServer } from "#src/investigation-status/status-server";
import { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

async function createTestWorkspace(goal: string): Promise<InvestigationWorkspace> {
    const directory = await mkdtemp(path.join(tmpdir(), "lab-server-test-"));
    const taskPath = path.join(directory, "task.json");
    await writeFile(taskPath, JSON.stringify({ goal }));
    return InvestigationWorkspace.initialize(directory, taskPath);
}

async function createTestServer() {
    return createStatusServer(await createTestWorkspace("Inspect the API"));
}

describe("status server", () => {
    it("returns a validated snapshot", async () => {
        const server = await createTestServer();
        const response = await server.inject({ method: "GET", url: "/api/status" });

        expect(response.statusCode).toBe(200);
        expect(response.json().investigation.goal).toBe("Inspect the API");
        await server.close();
    });

    it("rejects waking a running investigation", async () => {
        const server = await createTestServer();
        const response = await server.inject({ method: "POST", url: "/api/wake" });

        expect(response.statusCode).toBe(409);
        await server.close();
    });

    it("pauses a running investigation and gives up the cycle in flight before it sleeps", async () => {
        const workspace = await createTestWorkspace("Pause the run");
        const cancelled: string[] = [];
        const server = createStatusServer(workspace, {
            onPause: async () => {
                cancelled.push(workspace.getSnapshot().investigation.state);
            }
        });

        const response = await server.inject({ method: "POST", url: "/api/pause" });

        expect(response.statusCode).toBe(200);
        expect(response.json().investigation.state).toBe(InvestigationState.HIBERNATING);
        expect(cancelled).toEqual([InvestigationState.RUNNING]);
        await server.close();
    });

    it("starts a stopped run again on the operator's command", async () => {
        const workspace = await createTestWorkspace("Start the run again");
        const server = createStatusServer(workspace);
        await server.inject({ method: "POST", url: "/api/stop" });

        const restarted = await server.inject({ method: "POST", url: "/api/wake" });

        expect(restarted.statusCode).toBe(200);
        expect(restarted.json().investigation.state).toBe(InvestigationState.RUNNING);
        expect(workspace.getSnapshot().investigation.state).toBe(InvestigationState.RUNNING);
        await server.close();
    });

    it("keeps a failed run settled and holds the loop it never cancelled", async () => {
        const workspace = await createTestWorkspace("Leave the failure alone");
        let cancelled = false;
        const server = createStatusServer(workspace, {
            onStop: async () => {
                cancelled = true;
            }
        });
        await workspace.transition(InvestigationState.FAILED, "The director never answered", {
            failureReason: "The director never answered"
        });

        const stop = await server.inject({ method: "POST", url: "/api/stop" });
        const wake = await server.inject({ method: "POST", url: "/api/wake" });

        expect(stop.statusCode).toBe(409);
        expect(wake.statusCode).toBe(409);
        expect(cancelled).toBe(false);
        expect(workspace.getSnapshot().investigation.state).toBe(InvestigationState.FAILED);
        await server.close();
    });

    it("handles a repeated answer idempotently and a changed one as a conflict", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-capability-route-test-"));
        const taskPath = path.join(directory, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Resume with a capability" }));
        const workspace = await InvestigationWorkspace.initialize(directory, taskPath);
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
        const workspace = await InvestigationWorkspace.initialize(directory, taskPath);
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
            writeFile(taskPath, JSON.stringify({ goal: "Observe the investigation" })),
            writeFile(path.join(dashboardRoot, "index.html"), "<main>dashboard</main>")
        ]);
        const workspace = await InvestigationWorkspace.initialize(directory, taskPath);
        const server = createStatusServer(workspace, { dashboardRoot });

        const response = await server.inject({ method: "GET", url: "/claims/claim-1" });

        expect(response.statusCode).toBe(200);
        expect(response.body).toContain("dashboard");
        await server.close();
    });

    it("serves every subscription against the schema the dashboard validates with", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-subscriptions-test-"));
        const taskPath = path.join(directory, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Watch the subscriptions" }));
        const workspace = await InvestigationWorkspace.initialize(directory, taskPath);
        const server = createStatusServer(workspace, {
            subscriptions: new SubscriptionAllowanceReadings({
                read: async (kind) => ({
                    kind,
                    plan: "max",
                    windows: [{ durationMinutes: 300, usedPercent: 41, resetsAt: null }]
                })
            })
        });

        const response = await server.inject({ method: "GET", url: "/api/subscriptions" });

        expect(response.statusCode).toBe(200);
        expect(SubscriptionAllowanceRosterSchema.parse(response.json())).toHaveLength(3);
        await server.close();
    });

    it("re-asks the vendors for a refresh and serves the held reading to every other poll", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-subscriptions-refresh-test-"));
        const taskPath = path.join(directory, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Watch the subscriptions" }));
        const workspace = await InvestigationWorkspace.initialize(directory, taskPath);
        let asked = 0;
        const server = createStatusServer(workspace, {
            subscriptions: new SubscriptionAllowanceReadings({
                read: async (kind) => {
                    asked += 1;
                    return { kind, plan: "max", windows: [] };
                }
            })
        });

        await server.inject({ method: "GET", url: "/api/subscriptions" });
        await server.inject({ method: "GET", url: "/api/subscriptions" });
        const polled = asked;
        const refreshed = await server.inject({
            method: "GET",
            url: "/api/subscriptions?fresh=1"
        });

        expect(polled).toBe(3);
        expect(asked).toBe(6);
        expect(refreshed.statusCode).toBe(200);
        await server.close();
    });

    it("leaves the subscriptions route unserved when no readings were wired in", async () => {
        const server = await createTestServer();

        const response = await server.inject({ method: "GET", url: "/api/subscriptions" });

        expect(response.statusCode).toBe(404);
        await server.close();
    });

    it("exports every durable run file using portable relative paths", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-export-test-"));
        const taskPath = path.join(directory, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Export every artifact" }));
        const workspace = await InvestigationWorkspace.initialize(directory, taskPath);
        const artifactDirectory = path.join(workspace.runDirectory, "artifacts", "experiment-1");
        await mkdir(artifactDirectory, { recursive: true });
        await writeFile(path.join(artifactDirectory, "metrics.json"), JSON.stringify({ score: 1 }));
        const server = createStatusServer(workspace);

        const response = await server.inject({ method: "GET", url: "/api/export" });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            investigation_id: workspace.investigationId,
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
