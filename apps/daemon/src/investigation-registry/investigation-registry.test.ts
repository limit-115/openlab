import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { InvestigationRequestSchema } from "@lab/protocol/investigation-input/investigation-input.schema";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { LabSettingsSchema } from "@lab/protocol/lab-settings/lab-settings.schema";
import { describe, expect, it } from "vitest";
import { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import { InMemoryRuntime } from "#src/investigation-registry/investigation-runtime.fixture";
import { WorkspaceFile } from "#src/investigation-workspace/investigation-workspace.const";
import { ResearchLoopOutcomeStatus } from "#src/research-cycle/research-loop.const";
import type { ResearchLoopOutcome } from "#src/research-cycle/research-loop.types";

async function testRoot(name: string): Promise<string> {
    return mkdtemp(path.join(tmpdir(), `lab-registry-${name}-`));
}

function request(goal: string, harnessKinds?: AgentHarnessKind[]) {
    return InvestigationRequestSchema.parse({
        goal,
        ...(harnessKinds === undefined ? {} : { harness_kinds: harnessKinds })
    });
}

describe("InvestigationRegistry", () => {
    it("runs every investigation it takes on at the same time", async () => {
        const workspaceRoot = await testRoot("parallel");
        const runtime = new InMemoryRuntime();
        const running = new Set<string>();
        let release: () => void = () => undefined;
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });
        const registry = new InvestigationRegistry({
            workspaceRoot,
            persistence: runtime,
            investigations: runtime,
            researchLoop: async (workspace): Promise<ResearchLoopOutcome> => {
                running.add(workspace.investigationId);
                await held;
                return { status: ResearchLoopOutcomeStatus.CANCELLED };
            }
        });

        const first = await registry.create(request("Chase the first lead"));
        const second = await registry.create(request("Chase the second lead"));

        try {
            await expect.poll(() => running.size).toBe(2);
            expect(running).toEqual(
                new Set([first.workspace.investigationId, second.workspace.investigationId])
            );
            expect(first.workspace.runDirectory).not.toBe(second.workspace.runDirectory);
        } finally {
            release();
            await registry.close();
        }
    });

    it("gives each investigation the roster it was created with", async () => {
        const workspaceRoot = await testRoot("roster");
        const runtime = new InMemoryRuntime();
        const rosters = new Map<string, string[]>();
        const registry = new InvestigationRegistry({
            workspaceRoot,
            persistence: runtime,
            investigations: runtime,
            researchLoop: async (workspace, options): Promise<ResearchLoopOutcome> => {
                rosters.set(
                    workspace.investigationId,
                    (options.harnesses ?? []).map(({ kind }) => kind)
                );
                return { status: ResearchLoopOutcomeStatus.CANCELLED };
            }
        });

        const pinned = await registry.create(request("Run on one harness", [AgentHarnessKind.GLM]));
        const defaulted = await registry.create(request("Run on the default rotation"));

        try {
            await expect.poll(() => rosters.size).toBe(2);
            expect(rosters.get(pinned.workspace.investigationId)).toEqual([AgentHarnessKind.GLM]);
            expect(rosters.get(defaulted.workspace.investigationId)).toEqual([
                AgentHarnessKind.CODEX,
                AgentHarnessKind.CLAUDE,
                AgentHarnessKind.GLM
            ]);
        } finally {
            await registry.close();
        }
    });

    it("opens an investigation that named no harnesses on the lab's own roster", async () => {
        const workspaceRoot = await testRoot("lab-roster");
        const runtime = new InMemoryRuntime();
        const rosters = new Map<string, string[]>();
        const registry = new InvestigationRegistry({
            workspaceRoot,
            persistence: runtime,
            investigations: runtime,
            settings: {
                read: () =>
                    LabSettingsSchema.parse({
                        harness_roster: [AgentHarnessKind.GLM, AgentHarnessKind.CODEX]
                    })
            },
            researchLoop: async (workspace, options): Promise<ResearchLoopOutcome> => {
                rosters.set(
                    workspace.investigationId,
                    (options.harnesses ?? []).map(({ kind }) => kind)
                );
                return { status: ResearchLoopOutcomeStatus.CANCELLED };
            }
        });

        const settled = await registry.create(request("Take the lab's roster"));
        const pinned = await registry.create(
            request("Keep my own roster", [AgentHarnessKind.CLAUDE])
        );

        try {
            await expect.poll(() => rosters.size).toBe(2);
            expect(rosters.get(settled.workspace.investigationId)).toEqual([
                AgentHarnessKind.GLM,
                AgentHarnessKind.CODEX
            ]);
            expect(rosters.get(pinned.workspace.investigationId)).toEqual([
                AgentHarnessKind.CLAUDE
            ]);
        } finally {
            await registry.close();
        }
    });

    it("reopens a running investigation on restart and leaves a settled one asleep", async () => {
        const workspaceRoot = await testRoot("restore");
        const runtime = new InMemoryRuntime();
        const started: string[] = [];
        const first = new InvestigationRegistry({
            workspaceRoot,
            persistence: runtime,
            investigations: runtime,
            researchLoop: async (): Promise<ResearchLoopOutcome> => ({
                status: ResearchLoopOutcomeStatus.CANCELLED
            })
        });
        const working = await first.create(request("Keep working after the restart"));
        const settled = await first.create(request("Stay asleep after the restart"));
        await settled.workspace.transition(InvestigationState.STOPPED, "Operator stopped it");
        await first.close();

        const restarted = new InvestigationRegistry({
            workspaceRoot,
            persistence: runtime,
            investigations: runtime,
            researchLoop: async (workspace): Promise<ResearchLoopOutcome> => {
                started.push(workspace.investigationId);
                return { status: ResearchLoopOutcomeStatus.CANCELLED };
            }
        });
        await restarted.restore();

        try {
            await expect.poll(() => started.length).toBe(1);
            expect(started).toEqual([working.workspace.investigationId]);
            expect(restarted.list().map(({ id }) => id)).toEqual(
                expect.arrayContaining([
                    working.workspace.investigationId,
                    settled.workspace.investigationId
                ])
            );
        } finally {
            await restarted.close();
        }
    });

    it("summarises what an operator chooses between", async () => {
        const workspaceRoot = await testRoot("summary");
        const runtime = new InMemoryRuntime();
        const registry = new InvestigationRegistry({
            workspaceRoot,
            persistence: runtime,
            investigations: runtime,
            researchLoop: async (): Promise<ResearchLoopOutcome> => ({
                status: ResearchLoopOutcomeStatus.CANCELLED
            })
        });
        const held = await registry.create(request("Summarise this investigation"));
        await held.workspace.requestCapability({
            need: "A dedicated benchmarking host",
            reason: "The measurement needs a quiet machine",
            provisioningHint: "Reserve a bare-metal host",
            blocking: true
        });

        try {
            expect(registry.list()).toEqual([
                expect.objectContaining({
                    id: held.workspace.investigationId,
                    goal: "Summarise this investigation",
                    state: InvestigationState.RUNNING,
                    open_capability_count: 1,
                    assumption_count: 0,
                    finding_count: 0
                })
            ]);
        } finally {
            await registry.close();
        }
    });

    it("discards the run directory and the record when an investigation is removed", async () => {
        const workspaceRoot = await testRoot("remove");
        const runtime = new InMemoryRuntime();
        const registry = new InvestigationRegistry({
            workspaceRoot,
            persistence: runtime,
            investigations: runtime,
            researchLoop: async (): Promise<ResearchLoopOutcome> => ({
                status: ResearchLoopOutcomeStatus.CANCELLED
            })
        });
        const held = await registry.create(request("Discard this investigation"));
        const inputPath = path.join(held.workspace.runDirectory, WorkspaceFile.INPUT);
        expect(JSON.parse(await readFile(inputPath, "utf8")).goal).toBe(
            "Discard this investigation"
        );

        const removed = await registry.remove(held.workspace.investigationId);

        expect(removed).toBe(true);
        expect(registry.list()).toEqual([]);
        expect(await runtime.load(held.workspace.investigationId)).toBeUndefined();
        await expect(readFile(inputPath, "utf8")).rejects.toThrow();
        expect(await registry.remove(held.workspace.investigationId)).toBe(false);
        await registry.close();
    });

    it("tells a subscriber the roster moved without being asked", async () => {
        const workspaceRoot = await testRoot("roster-stream");
        const runtime = new InMemoryRuntime();
        const registry = new InvestigationRegistry({
            workspaceRoot,
            persistence: runtime,
            investigations: runtime,
            researchLoop: async (): Promise<ResearchLoopOutcome> => ({
                status: ResearchLoopOutcomeStatus.CANCELLED
            })
        });
        const published: number[] = [];
        const unsubscribe = registry.subscribe((roster) => published.push(roster.length));

        const held = await registry.create(request("Publish the roster"));
        await held.workspace.transition(InvestigationState.STOPPED, "Operator stopped it");
        await registry.remove(held.workspace.investigationId);
        unsubscribe();
        await registry.create(request("Nobody is listening any more"));

        expect(published).toEqual([1, 1, 0]);
        await registry.close();
    });
});
