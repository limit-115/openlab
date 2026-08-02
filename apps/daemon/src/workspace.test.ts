import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CapabilityStatus, EventType, EvidenceKind, LabState } from "@lab/protocol/constants";
import { afterEach, describe, expect, it } from "vitest";
import { validateFileArtifact } from "#src/artifact";
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
            workspace.provideCapability(request.id, "corpus://restricted/v1")
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

    it("rejects evidence artifacts outside the isolated run workspace", async () => {
        const workspace = await createWorkspace();
        const externalPath = path.join(path.dirname(workspace.runDirectory), "external.txt");
        await writeFile(externalPath, "not contained");
        const artifact = await validateFileArtifact(
            path.dirname(workspace.runDirectory),
            externalPath
        );

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
