import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { WakeTrigger } from "@lab/core/investigation-lifecycle/wake-trigger.const";
import { IncompatibleCheckpointError } from "@lab/db/runtime/incompatible-checkpoint";
import type { RecoverableRuntime } from "@lab/db/runtime/runtime-persistence.types";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AssumptionStatus } from "@lab/protocol/assumptions/assumption-status.const";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import type { Finding } from "@lab/protocol/findings/finding.types";
import { FindingStatus } from "@lab/protocol/findings/finding-status.const";
import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import type { InvestigationInput } from "@lab/protocol/investigation-input/investigation-input.types";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { afterEach, describe, expect, it } from "vitest";
import { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import type { WorkspaceRuntimePersistence } from "#src/investigation-workspace/investigation-workspace.types";

const directories: string[] = [];

afterEach(() => {
    directories.length = 0;
});

async function createWorkspace(): Promise<InvestigationWorkspace> {
    const directory = await mkdtemp(path.join(tmpdir(), "lab-workspace-test-"));
    directories.push(directory);
    const taskPath = path.join(directory, "task.json");
    await writeFile(taskPath, JSON.stringify({ goal: "Test a research claim" }));
    return InvestigationWorkspace.initialize(directory, taskPath);
}

/** Fills a workspace with the bet, run and claim a verdict needs something to point at. */
async function claimFinding(
    workspace: InvestigationWorkspace,
    confirmed: boolean
): Promise<Finding> {
    const timestamp = new Date().toISOString();
    const finding: Finding = {
        id: "finding-1",
        assumption_id: "assumption-1",
        run_id: "run-researcher-1",
        claim: "Reordering eviction by recency removes the stall",
        work: "Patched the allocator and measured the workload forty times",
        artifact_paths: [],
        status: confirmed ? FindingStatus.CONFIRMED : FindingStatus.UNVERIFIED,
        created_at: timestamp
    };
    await workspace.update((draft) => {
        draft.assumptions.push({
            id: "assumption-1",
            cycle: 0,
            statement: "The eviction order is the bottleneck",
            rationale: "Nobody measures eviction under this access pattern",
            status: AssumptionStatus.RESEARCHING,
            created_at: timestamp,
            updated_at: timestamp
        });
        draft.runs.push(
            {
                id: "run-researcher-1",
                role: AgentRole.RESEARCHER,
                assumption_id: "assumption-1",
                objective: "Spend the eviction bet",
                status: AgentRunStatus.SUCCEEDED,
                cwd: "/tmp/researcher",
                started_at: timestamp
            },
            {
                id: "run-verifier-1",
                role: AgentRole.VERIFIER,
                assumption_id: "assumption-1",
                objective: "Check the eviction claim",
                status: AgentRunStatus.SUCCEEDED,
                cwd: "/tmp/verifier",
                started_at: timestamp
            }
        );
        draft.findings.push(finding);
        if (confirmed) {
            draft.verdicts.push({
                id: "verdict-1",
                finding_id: finding.id,
                run_id: "run-verifier-1",
                confirmed: true,
                reasoning: "Rebuilt the workload from scratch and the stall was gone",
                created_at: timestamp
            });
        }
    });
    return finding;
}

describe("InvestigationWorkspace", () => {
    it("creates canonical protocol snapshots", async () => {
        const workspace = await createWorkspace();

        expect(workspace.getSnapshot().investigation.state).toBe(InvestigationState.RUNNING);
        const journal = JSON.parse(
            await readFile(path.join(workspace.runDirectory, "assumptions.json"), "utf8")
        );
        expect(journal).toEqual([]);
    });

    it("persists and publishes state transitions", async () => {
        const workspace = await createWorkspace();
        const observed: string[] = [];
        workspace.subscribe((event) => observed.push(event.type));

        await workspace.transition(InvestigationState.STOPPED, "test");

        expect(workspace.getSnapshot().investigation.state).toBe(InvestigationState.STOPPED);
        expect(observed).toContain(EventType.INVESTIGATION_STATE_CHANGED);
    });

    it("recovers an unfinished run for the same task", async () => {
        const workspace = await createWorkspace();
        const taskPath = path.join(path.dirname(path.dirname(workspace.runDirectory)), "task.json");
        const recovered = await InvestigationWorkspace.openOrCreate(
            path.dirname(path.dirname(workspace.runDirectory)),
            taskPath
        );

        expect(recovered.investigationId).toBe(workspace.investigationId);
        expect(recovered.recovered).toBe(true);
    });

    it("reopens a stopped run and replaces a failed one", async () => {
        const stopped = await createWorkspace();
        const stoppedRoot = path.dirname(path.dirname(stopped.runDirectory));
        await stopped.transition(InvestigationState.STOPPED, "The operator ended the run");
        const failed = await createWorkspace();
        const failedRoot = path.dirname(path.dirname(failed.runDirectory));
        await failed.transition(InvestigationState.FAILED, "The director never answered", {
            failureReason: "The director never answered"
        });

        const reopened = await InvestigationWorkspace.openOrCreate(
            stoppedRoot,
            path.join(stoppedRoot, "task.json")
        );
        const replaced = await InvestigationWorkspace.openOrCreate(
            failedRoot,
            path.join(failedRoot, "task.json")
        );

        expect(reopened.investigationId).toBe(stopped.investigationId);
        expect(reopened.getSnapshot().investigation.state).toBe(InvestigationState.STOPPED);
        expect(replaced.investigationId).not.toBe(failed.investigationId);
        expect(replaced.getSnapshot().investigation.state).toBe(InvestigationState.RUNNING);
    });

    it("starts a fresh run when the pointed-at checkpoint predates the protocol", async () => {
        const workspace = await createWorkspace();
        const workspaceRoot = path.dirname(path.dirname(workspace.runDirectory));
        const taskPath = path.join(workspaceRoot, "task.json");

        const started = await InvestigationWorkspace.openOrCreate(workspaceRoot, taskPath, {
            ...recoveryOnlyPersistence([]),
            initialize: async ({ snapshot }) => ({ snapshot, revision: 1 }),
            load: async (investigationId) => {
                if (investigationId !== workspace.investigationId) {
                    return undefined;
                }
                throw new IncompatibleCheckpointError(investigationId);
            }
        });

        expect(started.investigationId).not.toBe(workspace.investigationId);
        expect(started.recovered).toBe(false);
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
            path.join(workspaceRoot, "runs", "investigation-latest"),
            "2026-08-02T00:01:00.000Z",
            "investigation-latest"
        );
        await writeFile(path.join(workspaceRoot, "current.json"), "{corrupt");

        const recovered = await InvestigationWorkspace.openOrCreate(
            workspaceRoot,
            taskPath,
            recoveryOnlyPersistence([older, latest])
        );

        expect(recovered.investigationId).toBe("investigation-latest");
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
            InvestigationWorkspace.openOrCreate(
                workspaceRoot,
                taskPath,
                recoveryOnlyPersistence([escaped])
            )
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
        const workspace = await InvestigationWorkspace.initialize(directory, taskPath);
        const storedTask = { ...requestedTask, goal: "Different stored goal" };
        const snapshot = workspace.getSnapshot();
        snapshot.investigation.goal = storedTask.goal;
        const mismatched = makeRecoverableRuntime(
            storedTask,
            snapshot,
            workspace.runDirectory,
            "2026-08-02T00:00:00.000Z"
        );
        await writeFile(path.join(directory, "current.json"), "{corrupt");

        await expect(
            InvestigationWorkspace.openOrCreate(
                directory,
                taskPath,
                recoveryOnlyPersistence([mismatched])
            )
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
            path.join(workspaceRoot, "runs", "investigation-tied"),
            first.persistedAt,
            "investigation-tied"
        );
        await writeFile(path.join(workspaceRoot, "current.json"), "{corrupt");

        await expect(
            InvestigationWorkspace.openOrCreate(
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
            provisioningHint: "Run claude and sign in with claude.ai",
            blocking: true
        };

        const first = await workspace.requestCapability(input);
        const second = await workspace.requestCapability(input);

        expect(second.id).toBe(first.id);
        expect(workspace.getSnapshot().capability_requests).toHaveLength(1);
    });

    it("settles a request on a refusal as completely as on a handover", async () => {
        const workspace = await createWorkspace();
        const request = await workspace.requestCapability({
            need: "Independent dataset",
            reason: "The verifier needs independent observations",
            provisioningHint: "Mount the dataset in the run workspace",
            selfProvisioningAttempt:
                "Rebuilt it from public mirrors, which overlap the training set",
            blocking: true
        });
        await workspace.hibernate("Waiting for the independent dataset");

        await expect(
            workspace.answerCapability(request.id, "  Not giving you this one, build it yourself  ")
        ).resolves.toBe(true);

        const answered = workspace
            .getSnapshot()
            .capability_requests.find(({ id }) => id === request.id);
        expect(answered).toMatchObject({
            status: CapabilityStatus.ANSWERED,
            answer: "Not giving you this one, build it yourself"
        });
        expect(answered?.answered_at).toBeDefined();
        expect(workspace.getSnapshot().investigation.state).toBe(InvestigationState.RUNNING);
    });

    it("wakes a hibernating investigation on the operator answer", async () => {
        const workspace = await createWorkspace();
        const request = await workspace.requestCapability({
            need: "A licensed corpus",
            reason: "The bet is blocked on an operator-held resource",
            provisioningHint: "Point the run at a local copy",
            selfProvisioningAttempt: "Searched the public mirrors and found only redistributions",
            blocking: true
        });
        await workspace.hibernate("Waiting for a capability");

        await expect(
            workspace.answerCapability(request.id, "Mounted at /srv/corpora/licensed-v3")
        ).resolves.toBe(true);

        expect(workspace.getSnapshot().investigation.state).toBe(InvestigationState.RUNNING);
        expect(
            workspace
                .getEvents()
                .findLast(
                    (event) =>
                        event.type === EventType.INVESTIGATION_STATE_CHANGED &&
                        event.payload.state === InvestigationState.RUNNING
                )?.payload
        ).toMatchObject({ wake_trigger: WakeTrigger.CAPABILITY });
    });

    it("keeps the first answer when the same request is answered twice", async () => {
        const workspace = await createWorkspace();
        const request = await workspace.requestCapability({
            need: "Restricted corpus",
            reason: "The experiment requires licensed inputs",
            provisioningHint: "Provide a licensed local corpus",
            selfProvisioningAttempt: "Checked the open mirrors and none carry the licensed split",
            blocking: true
        });

        await expect(
            workspace.answerCapability(request.id, "No, use the open split")
        ).resolves.toBe(true);
        await expect(
            workspace.answerCapability(request.id, "No, use the open split")
        ).resolves.toBe(true);
        await expect(
            workspace.answerCapability(request.id, "Changed my mind, here it is")
        ).resolves.toBe(false);

        expect(
            workspace.getSnapshot().capability_requests.find(({ id }) => id === request.id)?.answer
        ).toBe("No, use the open split");
        expect(
            workspace.getEvents().filter(({ type }) => type === EventType.CAPABILITY_ANSWERED)
        ).toHaveLength(1);
    });

    it("refuses an empty answer", async () => {
        const workspace = await createWorkspace();
        const request = await workspace.requestCapability({
            need: "Restricted corpus",
            reason: "The experiment requires licensed inputs",
            provisioningHint: "Provide a licensed local corpus",
            selfProvisioningAttempt: "Checked the open mirrors and none carry the licensed split",
            blocking: true
        });

        await expect(workspace.answerCapability(request.id, "   ")).rejects.toThrow();
        expect(
            workspace.getSnapshot().capability_requests.find(({ id }) => id === request.id)?.status
        ).toBe(CapabilityStatus.OPEN);
    });

    it("writes a report of the spent bets before hibernating", async () => {
        const workspace = await createWorkspace();
        await claimFinding(workspace, false);
        await workspace.update((draft) => {
            const [assumption] = draft.assumptions;
            if (assumption === undefined) {
                throw new Error("Expected the seeded assumption");
            }
            assumption.status = AssumptionStatus.EXHAUSTED;
            assumption.outcome = "Eviction order made no difference under any load";
        });

        await workspace.hibernate("The director has nowhere else to look");

        expect(workspace.getSnapshot().investigation.state).toBe(InvestigationState.HIBERNATING);
        const report = await readFile(path.join(workspace.runDirectory, "report.md"), "utf8");
        expect(report).toContain("Hibernation report");
        expect(report).toContain("Eviction order made no difference under any load");
    });

    it("refuses a breakthrough that no verifier confirmed", async () => {
        const workspace = await createWorkspace();
        const finding = await claimFinding(workspace, false);

        await expect(workspace.recordBreakthrough(finding)).rejects.toThrow(
            "carries no confirming verdict"
        );
        expect(workspace.getSnapshot().investigation.state).toBe(InvestigationState.RUNNING);
    });

    it("pauses the investigation on a confirmed finding and writes the result out", async () => {
        const workspace = await createWorkspace();
        const finding = await claimFinding(workspace, true);

        const snapshot = await workspace.recordBreakthrough(finding);

        expect(snapshot.investigation.state).toBe(InvestigationState.BREAKTHROUGH);
        expect(snapshot.breakthrough_finding_id).toBe(finding.id);
        const result = JSON.parse(
            await readFile(path.join(workspace.runDirectory, "result.json"), "utf8")
        );
        expect(result).toMatchObject({ claim: finding.claim, verdict_id: "verdict-1" });
        expect(
            workspace.getEvents().some(({ type }) => type === EventType.BREAKTHROUGH_RECORDED)
        ).toBe(true);
    });
});

function makeRecoverableRuntime(
    task: InvestigationInput,
    sourceSnapshot: StatusSnapshot,
    workspacePath: string,
    persistedAt: string,
    investigationId: string = sourceSnapshot.investigation.id
): RecoverableRuntime {
    const snapshot = structuredClone(sourceSnapshot);
    snapshot.investigation.id = investigationId;
    return {
        task: structuredClone(task),
        workspacePath,
        checkpoint: { snapshot, revision: 1 },
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
