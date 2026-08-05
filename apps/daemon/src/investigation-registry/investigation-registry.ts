import { rm } from "node:fs/promises";
import type { InvestigationRequest } from "@openlab/protocol/investigation-input/investigation-input.types";
import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import type { InvestigationSummary } from "@openlab/protocol/investigation-status/investigation-summary.types";
import { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import { createHarnesses } from "#src/agent-harness/harness-factory";
import { ResearchLoopController } from "#src/daemon-runtime/research-loop-controller";
import {
    RESTORED_INVESTIGATION_LIMIT,
    RegistryCloseReason
} from "#src/investigation-registry/investigation-registry.const";
import type {
    HeldInvestigation,
    InvestigationRecords,
    InvestigationRegistryOptions,
    RegistryListener,
    RegistryPersistence,
    ResearchLoopRunner
} from "#src/investigation-registry/investigation-registry.types";
import { summarizeInvestigation } from "#src/investigation-registry/investigation-summary";
import { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import type { StatusListener } from "#src/investigation-workspace/investigation-workspace.types";
import type { LabSettingsReader } from "#src/lab-settings/lab-settings.types";
import { SHIPPED_LAB_SETTINGS } from "#src/lab-settings/lab-settings-store";
import { runResearchLoop } from "#src/research-cycle/research-loop";
import type { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

/**
 * Every investigation the lab is holding. One lab, one database, one set of subscriptions — and as
 * many investigations as the operator has started, each with its own run directory, its own agents
 * and its own research loop running alongside the others.
 */
export class InvestigationRegistry {
    readonly #held = new Map<string, HeldInvestigation>();
    readonly #unsubscribes = new Map<string, () => void>();
    readonly #listeners = new Set<RegistryListener>();
    readonly #eventListeners = new Set<StatusListener>();
    readonly #workspaceRoot: string;
    readonly #persistence: RegistryPersistence;
    readonly #investigations: InvestigationRecords;
    readonly #subscriptions: SubscriptionAllowanceReadings | undefined;
    readonly #settings: LabSettingsReader;
    readonly #researchLoop: ResearchLoopRunner;

    constructor(options: InvestigationRegistryOptions) {
        this.#workspaceRoot = options.workspaceRoot;
        this.#persistence = options.persistence;
        this.#investigations = options.investigations;
        this.#subscriptions = options.subscriptions;
        this.#settings = options.settings ?? SHIPPED_LAB_SETTINGS;
        this.#researchLoop = options.researchLoop ?? runResearchLoop;
    }

    /**
     * Reopens what the lab already holds. A run that was working when the daemon went down goes
     * back to work; one that had settled is held so the operator can read it and decide, which is
     * the same offer the lifecycle makes anywhere else.
     */
    async restore(): Promise<void> {
        const persisted = await this.#persistence.listPersisted(RESTORED_INVESTIGATION_LIMIT);
        for (const runtime of persisted) {
            const workspace = await InvestigationWorkspace.open(
                this.#workspaceRoot,
                runtime,
                this.#persistence
            );
            const held = this.#hold(workspace);
            if (workspace.getSnapshot().investigation.state === InvestigationState.RUNNING) {
                held.controller.start();
            }
        }
        this.#publish();
    }

    /**
     * Takes on a new investigation and puts it to work straight away. An operator who named no
     * harnesses gets the lab's roster as it stands now, and the investigation keeps that roster for
     * good: changing the lab's default later is not a reason to move work already under way.
     */
    async create(request: InvestigationRequest): Promise<HeldInvestigation> {
        const workspace = await InvestigationWorkspace.create(
            this.#workspaceRoot,
            {
                ...request,
                harness_kinds: request.harness_kinds ?? this.#settings.read().harness_roster
            },
            this.#persistence
        );
        const held = this.#hold(workspace);
        held.controller.start();
        this.#publish();
        return held;
    }

    get(investigationId: string): HeldInvestigation | undefined {
        return this.#held.get(investigationId);
    }

    /** The roster, most recently active first. */
    list(): InvestigationSummary[] {
        return [...this.#held.values()]
            .map(({ workspace }) => summarizeInvestigation(workspace))
            .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
    }

    /**
     * Forgets an investigation for good: the loop is cancelled, the row and everything cascading
     * from it are deleted, and the run directory goes with them. The database is cleared first, so
     * an interrupted removal leaves a readable directory rather than a row pointing at nothing.
     */
    async remove(investigationId: string): Promise<boolean> {
        const held = this.#held.get(investigationId);
        if (held === undefined) {
            return false;
        }
        await held.controller.close(new Error(RegistryCloseReason.REMOVED));
        this.#unsubscribes.get(investigationId)?.();
        this.#unsubscribes.delete(investigationId);
        this.#held.delete(investigationId);
        await this.#investigations.delete(investigationId);
        await rm(held.workspace.runDirectory, { recursive: true, force: true });
        this.#publish();
        return true;
    }

    /**
     * Gives every investigation the lab put to sleep on its subscriptions another go at them. The
     * caps are the lab's, so raising one answers the wait of every run held by it at once, and each
     * investigation decides for itself whether it was that wait it was sleeping on.
     */
    async wakeInvestigationsWaitingOnSubscriptions(reason: string): Promise<void> {
        await Promise.all(
            [...this.#held.values()].map((held) =>
                held.controller.wakeIfWaitingOnSubscriptions(new Error(reason))
            )
        );
    }

    /** The roster, whenever any investigation in it moves. */
    subscribe(listener: RegistryListener): () => void {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    }

    /**
     * Every event every investigation writes, as it is written. The roster says which investigation
     * moved and this says what happened, which is what anything reporting on the lab as a whole
     * needs: it watches one place rather than each investigation as it is taken on.
     */
    subscribeToEvents(listener: StatusListener): () => void {
        this.#eventListeners.add(listener);
        return () => this.#eventListeners.delete(listener);
    }

    async close(): Promise<void> {
        const closing = [...this.#held.values()].map((held) =>
            held.controller.close(new Error(RegistryCloseReason.DAEMON_CLOSING))
        );
        for (const unsubscribe of this.#unsubscribes.values()) {
            unsubscribe();
        }
        this.#unsubscribes.clear();
        await Promise.all(closing);
    }

    #hold(workspace: InvestigationWorkspace): HeldInvestigation {
        const activity = new AgentActivityHub();
        const controller = new ResearchLoopController(
            workspace,
            activity,
            this.#researchLoop,
            () => createHarnesses(workspace.input.harness_kinds),
            this.#settings,
            this.#subscriptions
        );
        const held: HeldInvestigation = { workspace, activity, controller };
        this.#held.set(workspace.investigationId, held);
        this.#unsubscribes.set(
            workspace.investigationId,
            workspace.subscribe((event, snapshot) => {
                this.#publish();
                for (const listener of this.#eventListeners) {
                    listener(event, snapshot);
                }
            })
        );
        return held;
    }

    #publish(): void {
        if (this.#listeners.size === 0) {
            return;
        }
        const roster = this.list();
        for (const listener of this.#listeners) {
            listener(roster);
        }
    }
}
