import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { deepseekCredentialPath } from "@openlab/harness/deepseek-credential";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { harnessNotInstalled } from "#src/agent-harness/agent-harness.fixture";
import { DEEPSEEK_KEY_ROUTE } from "#src/deepseek-key/deepseek-key.const";
import { HarnessReadinessChecks } from "#src/harness-readiness/harness-readiness-checks";
import { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import { InMemoryRuntime } from "#src/investigation-registry/investigation-runtime.fixture";
import { createStatusServer } from "#src/investigation-status/status-server";
import { ResearchLoopOutcomeStatus } from "#src/research-cycle/research-loop.const";
import type { ResearchLoopOutcome } from "#src/research-cycle/research-loop.types";

const API_KEY = "sk-operator-typed-this";

async function createTestLab() {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-deepseek-test-"));
    const runtime = new InMemoryRuntime();
    const registry = new InvestigationRegistry({
        workspaceRoot,
        persistence: runtime,
        investigations: runtime,
        researchLoop: async (): Promise<ResearchLoopOutcome> => ({
            status: ResearchLoopOutcomeStatus.CANCELLED
        })
    });
    return createStatusServer(registry, {
        harnesses: new HarnessReadinessChecks({ createHarness: harnessNotInstalled })
    });
}

/** The credential lives in the operator's home, so every test is given a home of its own. */
beforeEach(async () => {
    vi.stubEnv("HOME", await mkdtemp(path.join(tmpdir(), "lab-deepseek-home-")));
    return () => vi.unstubAllEnvs();
});

describe("DeepSeek key route", () => {
    it("keeps the key the operator typed and never serves it back", async () => {
        const server = await createTestLab();

        const stored = await server.inject({
            method: "PUT",
            url: DEEPSEEK_KEY_ROUTE,
            payload: { api_key: API_KEY }
        });
        const read = await server.inject({ method: "GET", url: DEEPSEEK_KEY_ROUTE });

        expect(stored.statusCode).toBe(200);
        expect(read.json()).toEqual({ key_set: true });
        expect(stored.body).not.toContain(API_KEY);
        expect(read.body).not.toContain(API_KEY);
        expect(await readFile(deepseekCredentialPath(), "utf8")).toContain(API_KEY);
        await server.close();
    });

    it("forgets the key, which is how the lab is stopped from spending the wallet", async () => {
        const server = await createTestLab();
        await server.inject({
            method: "PUT",
            url: DEEPSEEK_KEY_ROUTE,
            payload: { api_key: API_KEY }
        });

        const forgotten = await server.inject({ method: "DELETE", url: DEEPSEEK_KEY_ROUTE });
        const read = await server.inject({ method: "GET", url: DEEPSEEK_KEY_ROUTE });

        expect(forgotten.json()).toEqual({ key_set: false });
        expect(read.json()).toEqual({ key_set: false });
        await server.close();
    });

    it("refuses a blank key rather than storing one no run could use", async () => {
        const server = await createTestLab();

        const response = await server.inject({
            method: "PUT",
            url: DEEPSEEK_KEY_ROUTE,
            payload: { api_key: "   " }
        });
        const read = await server.inject({ method: "GET", url: DEEPSEEK_KEY_ROUTE });

        expect(response.statusCode).toBe(400);
        expect(read.json()).toEqual({ key_set: false });
        await server.close();
    });
});
