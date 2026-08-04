import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AgentEffortLevel, AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import { InvestigationInputSchema } from "@lab/protocol/investigation-input/investigation-input.schema";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { LabSettingsSchema } from "@lab/protocol/lab-settings/lab-settings.schema";
import { LabStorageSchema } from "@lab/protocol/lab-storage/lab-storage.schema";
import { SubscriptionAllowanceRosterSchema } from "@lab/protocol/subscription-allowance/subscription-allowance.schema";
import { describe, expect, it } from "vitest";
import { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import type { HeldInvestigation } from "#src/investigation-registry/investigation-registry.types";
import { InMemoryRuntime } from "#src/investigation-registry/investigation-runtime.fixture";
import { createStatusServer } from "#src/investigation-status/status-server";
import type { StatusServerOptions } from "#src/investigation-status/status-server.types";
import { InMemoryLabSettings } from "#src/lab-settings/lab-settings.fixture";
import { LabSettingsStore } from "#src/lab-settings/lab-settings-store";
import { ResearchLoopOutcomeStatus } from "#src/research-cycle/research-loop.const";
import type { ResearchLoopOutcome } from "#src/research-cycle/research-loop.types";
import { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

async function createTestLab(options: StatusServerOptions = {}) {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-server-test-"));
    const runtime = new InMemoryRuntime();
    const registry = new InvestigationRegistry({
        workspaceRoot,
        persistence: runtime,
        investigations: runtime,
        researchLoop: async (): Promise<ResearchLoopOutcome> => ({
            status: ResearchLoopOutcomeStatus.CANCELLED
        })
    });
    return {
        workspaceRoot,
        registry,
        server: createStatusServer(registry, options),
        open: (goal: string): Promise<HeldInvestigation> =>
            registry.create(InvestigationInputSchema.parse({ goal }))
    };
}

describe("status server", () => {
    it("returns a validated snapshot for the investigation the address names", async () => {
        const lab = await createTestLab();
        const held = await lab.open("Inspect the API");

        const response = await lab.server.inject({
            method: "GET",
            url: `/api/investigations/${held.workspace.investigationId}/status`
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().investigation.goal).toBe("Inspect the API");
        await lab.server.close();
    });

    it("answers 404 for an investigation the lab does not hold", async () => {
        const lab = await createTestLab();

        const response = await lab.server.inject({
            method: "GET",
            url: "/api/investigations/investigation-nobody-started/status"
        });

        expect(response.statusCode).toBe(404);
        await lab.server.close();
    });

    it("creates an investigation from a goal and lists it beside the others", async () => {
        const lab = await createTestLab();
        await lab.open("The first lead");

        const created = await lab.server.inject({
            method: "POST",
            url: "/api/investigations",
            payload: { goal: "The second lead" }
        });
        const roster = await lab.server.inject({ method: "GET", url: "/api/investigations" });

        expect(created.statusCode).toBe(201);
        expect(created.json().investigation.state).toBe(InvestigationState.RUNNING);
        expect(roster.json().map((entry: { goal: string }) => entry.goal)).toEqual(
            expect.arrayContaining(["The first lead", "The second lead"])
        );
        await lab.server.close();
    });

    it("refuses an investigation with no goal to chase", async () => {
        const lab = await createTestLab();

        const response = await lab.server.inject({
            method: "POST",
            url: "/api/investigations",
            payload: { context: ["Nothing to chase"] }
        });

        expect(response.statusCode).toBe(400);
        expect(lab.registry.list()).toEqual([]);
        await lab.server.close();
    });

    it("discards an investigation and forgets it, then reports it gone", async () => {
        const lab = await createTestLab();
        const held = await lab.open("Discard me");

        const discarded = await lab.server.inject({
            method: "DELETE",
            url: `/api/investigations/${held.workspace.investigationId}`
        });
        const again = await lab.server.inject({
            method: "DELETE",
            url: `/api/investigations/${held.workspace.investigationId}`
        });

        expect(discarded.statusCode).toBe(204);
        expect(again.statusCode).toBe(404);
        expect(lab.registry.list()).toEqual([]);
        await lab.server.close();
    });

    it("rejects waking a running investigation", async () => {
        const lab = await createTestLab();
        const held = await lab.open("Already running");

        const response = await lab.server.inject({
            method: "POST",
            url: `/api/investigations/${held.workspace.investigationId}/wake`
        });

        expect(response.statusCode).toBe(409);
        await lab.server.close();
    });

    it("pauses one investigation without touching the other", async () => {
        const lab = await createTestLab();
        const paused = await lab.open("Pause this one");
        const untouched = await lab.open("Keep working");

        const response = await lab.server.inject({
            method: "POST",
            url: `/api/investigations/${paused.workspace.investigationId}/pause`
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().investigation.state).toBe(InvestigationState.HIBERNATING);
        expect(untouched.workspace.getSnapshot().investigation.state).toBe(
            InvestigationState.RUNNING
        );
        await lab.server.close();
    });

    it("starts a stopped investigation again on the operator's command", async () => {
        const lab = await createTestLab();
        const held = await lab.open("Start the investigation again");
        const url = `/api/investigations/${held.workspace.investigationId}`;
        await lab.server.inject({ method: "POST", url: `${url}/stop` });

        const restarted = await lab.server.inject({ method: "POST", url: `${url}/wake` });

        expect(restarted.statusCode).toBe(200);
        expect(restarted.json().investigation.state).toBe(InvestigationState.RUNNING);
        expect(held.workspace.getSnapshot().investigation.state).toBe(InvestigationState.RUNNING);
        await lab.server.close();
    });

    it("keeps a failed investigation settled", async () => {
        const lab = await createTestLab();
        const held = await lab.open("Leave the failure alone");
        const url = `/api/investigations/${held.workspace.investigationId}`;
        await held.workspace.transition(InvestigationState.FAILED, "The director never answered", {
            failureReason: "The director never answered"
        });

        const stop = await lab.server.inject({ method: "POST", url: `${url}/stop` });
        const wake = await lab.server.inject({ method: "POST", url: `${url}/wake` });

        expect(stop.statusCode).toBe(409);
        expect(wake.statusCode).toBe(409);
        expect(held.workspace.getSnapshot().investigation.state).toBe(InvestigationState.FAILED);
        await lab.server.close();
    });

    it("handles a repeated answer idempotently and a changed one as a conflict", async () => {
        const lab = await createTestLab();
        const held = await lab.open("Resume with a capability");
        const request = await held.workspace.requestCapability({
            need: "Independent dataset",
            reason: "The verifier needs independent observations",
            provisioningHint: "Mount the dataset in the run workspace",
            selfProvisioningAttempt:
                "Rebuilt it from public mirrors, which overlap the training set",
            blocking: true
        });
        const url = `/api/investigations/${held.workspace.investigationId}/capabilities/${request.id}/answer`;
        const answer = "No. Report the overlap and carry the limitation instead.";

        const first = await lab.server.inject({ method: "POST", url, payload: { answer } });
        const retry = await lab.server.inject({ method: "POST", url, payload: { answer } });
        const conflict = await lab.server.inject({
            method: "POST",
            url,
            payload: { answer: "Changed my mind, mounted at /srv/corpora/independent-v1" }
        });

        expect(first.statusCode).toBe(202);
        expect(retry.statusCode).toBe(202);
        expect(conflict.statusCode).toBe(409);
        expect(
            held.workspace.getSnapshot().capability_requests.find(({ id }) => id === request.id)
        ).toMatchObject({ status: CapabilityStatus.ANSWERED, answer });
        expect(
            held.workspace.getEvents().filter(({ type }) => type === EventType.CAPABILITY_ANSWERED)
        ).toHaveLength(1);
        await lab.server.close();
    });

    it("returns 400 for an empty answer without settling the request", async () => {
        const lab = await createTestLab();
        const held = await lab.open("Answer a capability request");
        const request = await held.workspace.requestCapability({
            need: "Licensed dataset",
            reason: "The verifier needs licensed observations",
            provisioningHint: "Point the run at a local copy",
            selfProvisioningAttempt: "Checked the open mirrors and none carry the licensed split",
            blocking: true
        });

        const response = await lab.server.inject({
            method: "POST",
            url: `/api/investigations/${held.workspace.investigationId}/capabilities/${request.id}/answer`,
            payload: { answer: "   " }
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({ error: "A capability answer must not be empty" });
        expect(
            held.workspace.getSnapshot().capability_requests.find(({ id }) => id === request.id)
        ).toMatchObject({ status: CapabilityStatus.OPEN });
        expect(held.workspace.getEvents().map(({ type }) => type)).not.toContain(
            EventType.CAPABILITY_ANSWERED
        );
        await lab.server.close();
    });

    it("serves the built dashboard when provided", async () => {
        const dashboardRoot = await mkdtemp(path.join(tmpdir(), "lab-dashboard-test-"));
        await mkdir(dashboardRoot, { recursive: true });
        await writeFile(path.join(dashboardRoot, "index.html"), "<main>dashboard</main>");
        const lab = await createTestLab({ dashboardRoot });

        const response = await lab.server.inject({ method: "GET", url: "/claims/claim-1" });

        expect(response.statusCode).toBe(200);
        expect(response.body).toContain("dashboard");
        await lab.server.close();
    });

    it("serves every subscription against the schema the dashboard validates with", async () => {
        const lab = await createTestLab({
            subscriptions: new SubscriptionAllowanceReadings({
                read: async (kind) => ({
                    kind,
                    plan: "max",
                    windows: [{ durationMinutes: 300, usedPercent: 41, resetsAt: null }]
                })
            })
        });

        const response = await lab.server.inject({ method: "GET", url: "/api/subscriptions" });

        expect(response.statusCode).toBe(200);
        expect(SubscriptionAllowanceRosterSchema.parse(response.json())).toHaveLength(3);
        await lab.server.close();
    });

    it("re-asks the vendors for a refresh and serves the held reading to every other poll", async () => {
        let asked = 0;
        const lab = await createTestLab({
            subscriptions: new SubscriptionAllowanceReadings({
                read: async (kind) => {
                    asked += 1;
                    return { kind, plan: "max", windows: [] };
                }
            })
        });

        await lab.server.inject({ method: "GET", url: "/api/subscriptions" });
        await lab.server.inject({ method: "GET", url: "/api/subscriptions" });
        const polled = asked;
        const refreshed = await lab.server.inject({
            method: "GET",
            url: "/api/subscriptions?fresh=1"
        });

        expect(polled).toBe(3);
        expect(asked).toBe(6);
        expect(refreshed.statusCode).toBe(200);
        await lab.server.close();
    });

    it("leaves the subscriptions route unserved when no readings were wired in", async () => {
        const lab = await createTestLab();

        const response = await lab.server.inject({ method: "GET", url: "/api/subscriptions" });

        expect(response.statusCode).toBe(404);
        await lab.server.close();
    });

    it("reports what each investigation takes up under the workspace root", async () => {
        const lab = await createTestLab();
        const held = await lab.open("Fill a run directory");
        const server = createStatusServer(lab.registry, { workspaceRoot: lab.workspaceRoot });

        const response = await server.inject({ method: "GET", url: "/api/storage" });

        const storage = LabStorageSchema.parse(response.json());
        const run = storage.runs.find(
            ({ investigation_id }) => investigation_id === held.workspace.investigationId
        );
        expect(run?.goal).toBe("Fill a run directory");
        expect(run?.path).toBe(held.workspace.runDirectory);
        expect(run?.file_count).toBeGreaterThan(0);
        expect(storage.bytes).toBeGreaterThan(0);
        await server.close();
        await lab.server.close();
    });

    it("empties the lab on a purge, directories and roster together", async () => {
        const lab = await createTestLab();
        await lab.open("Purge me");
        await lab.open("Purge me too");
        const server = createStatusServer(lab.registry, { workspaceRoot: lab.workspaceRoot });

        const response = await server.inject({ method: "POST", url: "/api/storage/purge" });

        expect(LabStorageSchema.parse(response.json()).runs).toEqual([]);
        expect(lab.registry.list()).toEqual([]);
        expect(await readdir(path.join(lab.workspaceRoot, "runs"))).toEqual([]);
        await server.close();
        await lab.server.close();
    });

    it("leaves the storage routes unserved when no workspace root was wired in", async () => {
        const lab = await createTestLab();

        const response = await lab.server.inject({ method: "GET", url: "/api/storage" });

        expect(response.statusCode).toBe(404);
        await lab.server.close();
    });

    it("serves the shipped defaults for a lab nobody has configured", async () => {
        const lab = await createTestLab({
            settings: new LabSettingsStore(new InMemoryLabSettings())
        });

        const response = await lab.server.inject({ method: "GET", url: "/api/settings" });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual(LabSettingsSchema.parse({}));
        await lab.server.close();
    });

    it("puts the written settings in force, so the next read is the operator's document", async () => {
        const lab = await createTestLab({
            settings: new LabSettingsStore(new InMemoryLabSettings())
        });
        const settings = LabSettingsSchema.parse({
            harness_roster: [AgentHarnessKind.CLAUDE],
            role_execution: [
                {
                    role: AgentRole.DIRECTOR,
                    effort: AgentEffortLevel.MAX,
                    models: [{ harness: AgentHarnessKind.CLAUDE, model: "opus" }]
                }
            ]
        });

        const written = await lab.server.inject({
            method: "PUT",
            url: "/api/settings",
            payload: settings
        });
        const read = await lab.server.inject({ method: "GET", url: "/api/settings" });

        expect(written.statusCode).toBe(200);
        expect(read.json()).toEqual(settings);
        await lab.server.close();
    });

    it("refuses settings the lab cannot run and keeps the ones it had", async () => {
        const lab = await createTestLab({
            settings: new LabSettingsStore(new InMemoryLabSettings())
        });

        const response = await lab.server.inject({
            method: "PUT",
            url: "/api/settings",
            payload: { harness_roster: ["a-harness-that-does-not-exist"] }
        });
        const read = await lab.server.inject({ method: "GET", url: "/api/settings" });

        expect(response.statusCode).toBe(400);
        expect(read.json()).toEqual(LabSettingsSchema.parse({}));
        await lab.server.close();
    });

    it("leaves the settings route unserved when no store was wired in", async () => {
        const lab = await createTestLab();

        const response = await lab.server.inject({ method: "GET", url: "/api/settings" });

        expect(response.statusCode).toBe(404);
        await lab.server.close();
    });

    it("exports every durable run file using portable relative paths", async () => {
        const lab = await createTestLab();
        const held = await lab.open("Export every artifact");
        const artifactDirectory = path.join(
            held.workspace.runDirectory,
            "artifacts",
            "experiment-1"
        );
        await mkdir(artifactDirectory, { recursive: true });
        await writeFile(path.join(artifactDirectory, "metrics.json"), JSON.stringify({ score: 1 }));

        const response = await lab.server.inject({
            method: "GET",
            url: `/api/investigations/${held.workspace.investigationId}/export`
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            investigation_id: held.workspace.investigationId,
            run_directory: held.workspace.runDirectory
        });
        expect(response.json().files).toEqual(
            expect.arrayContaining([
                "artifacts/experiment-1/metrics.json",
                "assumptions.json",
                "events.json",
                "investigation.json",
                "status.json"
            ])
        );
        await lab.server.close();
    });
});
