import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { EventType, LabState } from "@lab/protocol/constants";
import { afterEach, describe, expect, it } from "vitest";
import { LabWorkspace } from "#src/workspace";

const directories: string[] = [];

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

    it("writes a report before hibernating on a plateau", async () => {
        const workspace = await createWorkspace();

        await workspace.hibernateForPlateau("No informative experiments remain");

        expect(workspace.getSnapshot().lab.state).toBe(LabState.HIBERNATING);
        await expect(
            readFile(path.join(workspace.runDirectory, "report.md"), "utf8")
        ).resolves.toContain("Plateau report");
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
});
