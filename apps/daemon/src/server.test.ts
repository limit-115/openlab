import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createStatusServer } from "#src/server";
import { LabWorkspace } from "#src/workspace";

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
});
