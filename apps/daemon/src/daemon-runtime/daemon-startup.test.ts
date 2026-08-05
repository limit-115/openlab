import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { WakeTrigger } from "@lab/core/investigation-lifecycle/wake-trigger.const";
import type { NotificationMessage } from "@lab/notifier/notification-message.types";
import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import { NotificationSettingsSchema } from "@lab/protocol/operator-notifications/notification-settings.schema";
import { describe, expect, it } from "vitest";
import { startDaemon } from "#src/daemon-runtime/daemon-startup";
import type { RunningDaemon } from "#src/daemon-runtime/daemon-startup.types";
import type {
    HeldInvestigation,
    ResearchLoopRunner
} from "#src/investigation-registry/investigation-registry.types";
import { InMemoryRuntime } from "#src/investigation-registry/investigation-runtime.fixture";
import { InMemoryLabSettings } from "#src/lab-settings/lab-settings.fixture";
import { InMemoryNotificationSettings } from "#src/operator-notifications/notification-settings.fixture";
import { ResearchLoopOutcomeStatus } from "#src/research-cycle/research-loop.const";

const TestDatabase = {
    URL: "postgres://test:test@127.0.0.1:5432/test"
} as const;

const CAPABILITY_ANSWER = "Mounted at /srv/corpora/independent-v1" as const;

async function startTestDaemon(
    name: string,
    researchLoop: ResearchLoopRunner,
    runtime: InMemoryRuntime = new InMemoryRuntime(),
    home?: string
): Promise<RunningDaemon> {
    const workspaceRoot = home ?? (await mkdtemp(path.join(tmpdir(), `lab-daemon-${name}-`)));
    return startDaemon(
        { workspaceRoot, port: 0, databaseUrl: TestDatabase.URL },
        {
            openDatabase: async () => ({
                persistence: runtime,
                investigations: runtime,
                settings: new InMemoryLabSettings(),
                notifications: new InMemoryNotificationSettings(),
                close: async () => undefined
            }),
            researchLoop
        }
    );
}

async function openInvestigation(daemon: RunningDaemon, goal: string): Promise<HeldInvestigation> {
    const created = await daemon.app.inject({
        method: "POST",
        url: "/api/investigations",
        payload: { goal }
    });
    const held = daemon.registry.get(created.json().investigation.id);
    if (held === undefined) {
        throw new Error("The daemon did not hold the investigation it just created");
    }
    return held;
}

describe("daemon startup", () => {
    it("starts research exactly once after a committed capability wake transition", async () => {
        let runs = 0;
        let markFirstRunReady: () => void = () => undefined;
        const firstRunReady = new Promise<void>((resolveReady) => {
            markFirstRunReady = resolveReady;
        });
        const daemon = await startTestDaemon("trigger-test", async (workspace, { signal }) => {
            runs += 1;
            if (runs === 1) {
                const reason = "Test plateau";
                await workspace.hibernate(reason);
                await new Promise<void>((resolveWake) => {
                    const unsubscribe = workspace.subscribe((event, snapshot) => {
                        if (
                            event.type === EventType.INVESTIGATION_STATE_CHANGED &&
                            snapshot.investigation.state === InvestigationState.RUNNING
                        ) {
                            unsubscribe();
                            resolveWake();
                        }
                    });
                    signal?.addEventListener(
                        "abort",
                        () => {
                            unsubscribe();
                            resolveWake();
                        },
                        { once: true }
                    );
                    markFirstRunReady();
                });
                if (signal?.aborted === true) {
                    return { status: ResearchLoopOutcomeStatus.CANCELLED };
                }
                return { status: ResearchLoopOutcomeStatus.HIBERNATING, reason };
            }
            return { status: ResearchLoopOutcomeStatus.CANCELLED };
        });

        try {
            const held = await openInvestigation(daemon, "Resume autonomous research");
            await firstRunReady;
            expect(held.workspace.getSnapshot().investigation.state).toBe(
                InvestigationState.HIBERNATING
            );

            const request = await held.workspace.requestCapability({
                need: "An independent corpus",
                reason: "The research loop requires an operator-held resource",
                provisioningHint: "Point the run at a local copy",
                selfProvisioningAttempt: "Searched the public mirrors and came up short",
                blocking: true
            });
            const response = await daemon.app.inject({
                method: "POST",
                url: `/api/investigations/${held.workspace.investigationId}/capabilities/${request.id}/answer`,
                payload: { answer: CAPABILITY_ANSWER }
            });
            expect(response.statusCode).toBe(202);

            expect(held.workspace.getSnapshot().investigation.state).toBe(
                InvestigationState.RUNNING
            );
            expect(
                held.workspace
                    .getEvents()
                    .findLast(
                        (event) =>
                            event.type === EventType.INVESTIGATION_STATE_CHANGED &&
                            event.payload.state === InvestigationState.RUNNING
                    )?.payload
            ).toMatchObject({ wake_trigger: WakeTrigger.CAPABILITY });
            await expect.poll(() => runs).toBe(2);
            await new Promise<void>((resolveTurn) => setImmediate(resolveTurn));
            expect(runs).toBe(2);
        } finally {
            await daemon.close();
        }
    });

    it("reopens what the lab was working on when the daemon comes back", async () => {
        const runtime = new InMemoryRuntime();
        const home = await mkdtemp(path.join(tmpdir(), "lab-daemon-restart-"));
        const first = await startTestDaemon(
            "restart",
            async () => ({ status: ResearchLoopOutcomeStatus.CANCELLED }),
            runtime,
            home
        );
        const working = await openInvestigation(first, "Carry on after the restart");
        const settled = await openInvestigation(first, "Stay settled after the restart");
        await settled.workspace.transition(InvestigationState.STOPPED, "Operator stopped it");
        await first.close();

        const resumed: string[] = [];
        const restarted = await startTestDaemon(
            "restart",
            async (workspace) => {
                resumed.push(workspace.investigationId);
                return { status: ResearchLoopOutcomeStatus.CANCELLED };
            },
            runtime,
            home
        );

        try {
            await expect.poll(() => resumed.length).toBe(1);
            expect(resumed).toEqual([working.workspace.investigationId]);
            expect(restarted.registry.list()).toHaveLength(2);
        } finally {
            await restarted.close();
        }
    });

    it("unsubscribes the research controller when the daemon closes", async () => {
        let runs = 0;
        const daemon = await startTestDaemon("close-test", async () => {
            runs += 1;
            return { status: ResearchLoopOutcomeStatus.CANCELLED };
        });
        const held = await openInvestigation(daemon, "Close lifecycle listeners");
        await expect.poll(() => runs).toBe(1);

        const request = await held.workspace.requestCapability({
            need: "An independent corpus",
            reason: "The research loop requires an operator-held resource",
            provisioningHint: "Point the run at a local copy",
            selfProvisioningAttempt: "Searched the public mirrors and came up short",
            blocking: true
        });
        await daemon.close();
        await held.workspace.hibernate("Test listener cleanup");
        await held.workspace.answerCapability(request.id, CAPABILITY_ANSWER);
        await new Promise<void>((resolveTurn) => setImmediate(resolveTurn));

        expect(held.workspace.getSnapshot().investigation.state).toBe(InvestigationState.RUNNING);
        expect(runs).toBe(1);
    });

    /**
     * The one line that turns everything an investigation writes into something the operator hears
     * about. Without it the settings page still works and nothing is ever sent.
     */
    it("carries a moment an investigation reached out to the channel configured for it", async () => {
        const sent: NotificationMessage[] = [];
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-daemon-notify-"));
        const runtime = new InMemoryRuntime();
        const daemon = await startDaemon(
            { workspaceRoot, port: 0, databaseUrl: TestDatabase.URL },
            {
                openDatabase: async () => ({
                    persistence: runtime,
                    investigations: runtime,
                    settings: new InMemoryLabSettings(),
                    notifications: new InMemoryNotificationSettings(
                        NotificationSettingsSchema.parse({
                            channels: [
                                {
                                    kind: NotificationChannelKind.TELEGRAM,
                                    enabled: true,
                                    events: [EventType.CAPABILITY_REQUESTED],
                                    bot_token: "1234:secret",
                                    chat_id: "-1001"
                                }
                            ]
                        })
                    ),
                    close: async () => undefined
                }),
                researchLoop: async () => ({ status: ResearchLoopOutcomeStatus.CANCELLED }),
                openNotificationChannel: () => ({
                    kind: NotificationChannelKind.TELEGRAM,
                    deliver: async (message) => {
                        sent.push(message);
                        return {};
                    }
                })
            }
        );
        const held = await openInvestigation(daemon, "Reach the operator");

        await held.workspace.requestCapability({
            need: "An independent corpus",
            reason: "Nothing public settles the claim",
            provisioningHint: "Point the run at a local copy",
            blocking: true
        });
        await expect.poll(() => sent.length).toBe(1);

        expect(sent[0]?.body).toBe("An independent corpus");
        expect(sent[0]?.link?.url).toContain(held.workspace.investigationId);
        await daemon.close();
    });
});
