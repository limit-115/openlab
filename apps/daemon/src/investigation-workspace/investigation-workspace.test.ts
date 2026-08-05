import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { WakeTrigger } from "@nightlab/core/investigation-lifecycle/wake-trigger.const";
import type { PersistedRuntime } from "@nightlab/db/runtime/runtime-persistence.types";
import { AgentRunStatus } from "@nightlab/protocol/agent-runs/agent-run-status.const";
import { AgentRole } from "@nightlab/protocol/agents/agent-role.const";
import { AssumptionStatus } from "@nightlab/protocol/assumptions/assumption-status.const";
import { CapabilityStatus } from "@nightlab/protocol/capabilities/capability-request.const";
import type { Finding } from "@nightlab/protocol/findings/finding.types";
import { FindingStatus } from "@nightlab/protocol/findings/finding-status.const";
import { EventType } from "@nightlab/protocol/investigation-events/event-type.const";
import { InvestigationInputSchema } from "@nightlab/protocol/investigation-input/investigation-input.schema";
import type { InvestigationInput } from "@nightlab/protocol/investigation-input/investigation-input.types";
import { InvestigationState } from "@nightlab/protocol/investigation-lifecycle/investigation-state.const";
import { afterEach, describe, expect, it } from "vitest";
import { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { WorkspaceFile } from "#src/investigation-workspace/investigation-workspace.const";
import type { WorkspaceRuntimePersistence } from "#src/investigation-workspace/investigation-workspace.types";

const directories: string[] = [];

afterEach(() => {
    directories.length = 0;
});

async function createWorkspace(goal = "Test a research claim"): Promise<InvestigationWorkspace> {
    const directory = await mkdtemp(path.join(tmpdir(), "lab-workspace-test-"));
    directories.push(directory);
    return InvestigationWorkspace.create(directory, InvestigationInputSchema.parse({ goal }));
}

function workspaceRootOf(workspace: InvestigationWorkspace): string {
    return path.dirname(path.dirname(workspace.runDirectory));
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
            await readFile(path.join(workspace.runDirectory, WorkspaceFile.ASSUMPTIONS), "utf8")
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

    it("reopens an investigation from its checkpoint and rewrites the run directory", async () => {
        const workspace = await createWorkspace("Reopen this investigation");
        const workspaceRoot = workspaceRootOf(workspace);
        await writeFile(path.join(workspace.runDirectory, WorkspaceFile.INPUT), "{corrupt");

        const reopened = await InvestigationWorkspace.open(
            workspaceRoot,
            persistedRuntime(workspace),
            readOnlyPersistence()
        );

        expect(reopened.investigationId).toBe(workspace.investigationId);
        expect(reopened.recovered).toBe(true);
        expect(
            JSON.parse(
                await readFile(path.join(reopened.runDirectory, WorkspaceFile.INPUT), "utf8")
            )
        ).toEqual(workspace.input);
    });

    it("refuses to reopen a run directory outside NIGHTLAB_HOME", async () => {
        const workspace = await createWorkspace("Escape the home");
        const workspaceRoot = workspaceRootOf(workspace);
        const escaped = {
            ...persistedRuntime(workspace),
            workspacePath: path.join(workspaceRoot, "..", "escaped-run")
        };

        await expect(
            InvestigationWorkspace.open(workspaceRoot, escaped, readOnlyPersistence())
        ).rejects.toThrow("escapes NIGHTLAB_HOME");
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

    it("dates a sleep the lab will end by itself, and drops the date once it has", async () => {
        const workspace = await createWorkspace();
        const resumeAt = "2026-08-09T13:55:53.000Z";

        await workspace.hibernate("Every subscription is at its cap", resumeAt);
        expect(workspace.getSnapshot().investigation.resume_at).toBe(resumeAt);

        await workspace.wakeIfHibernating("The subscriptions are back", WakeTrigger.ALLOWANCE);

        expect(workspace.getSnapshot().investigation.state).toBe(InvestigationState.RUNNING);
        expect(workspace.getSnapshot().investigation.resume_at).toBeUndefined();
    });

    it("leaves a sleep nobody can date waiting for a person", async () => {
        const workspace = await createWorkspace();

        await workspace.hibernate("The director has nowhere else to look");

        expect(workspace.getSnapshot().investigation.resume_at).toBeUndefined();
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
            await readFile(path.join(workspace.runDirectory, WorkspaceFile.RESULT), "utf8")
        );
        expect(result).toMatchObject({ claim: finding.claim, verdict_id: "verdict-1" });
        expect(
            workspace.getEvents().some(({ type }) => type === EventType.BREAKTHROUGH_RECORDED)
        ).toBe(true);
    });
});

function persistedRuntime(workspace: InvestigationWorkspace): PersistedRuntime {
    const snapshot = workspace.getSnapshot();
    return {
        task: structuredClone(workspace.input) as InvestigationInput,
        workspacePath: workspace.runDirectory,
        checkpoint: { snapshot, revision: 1 },
        persistedAt: snapshot.investigation.updated_at
    };
}

/** Reopening reads events and commits nothing until the investigation moves. */
function readOnlyPersistence(): WorkspaceRuntimePersistence {
    return {
        initialize: async () => {
            throw new Error("Unexpected runtime initialization");
        },
        load: async () => undefined,
        commit: async () => {
            throw new Error("Unexpected runtime commit");
        },
        eventsAfter: async () => [],
        retask: async () => {
            throw new Error("Unexpected runtime retask");
        }
    };
}
