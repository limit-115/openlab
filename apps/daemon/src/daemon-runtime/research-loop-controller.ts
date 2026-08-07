import { WakeTrigger } from "@openlab/core/investigation-lifecycle/wake-trigger.const";
import type { AgentHarness } from "@openlab/harness/agent-harness.types";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import type { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import { RESUME_REASON, RESUME_STEP_MS } from "#src/daemon-runtime/research-loop-controller.const";
import type { HarnessAllowanceReadings } from "#src/harness-allowance/harness-allowance-readings";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import type { LabSettingsReader } from "#src/lab-settings/lab-settings.types";
import type {
    ResearchLoopOptions,
    ResearchLoopOutcome
} from "#src/research-cycle/research-loop.types";

export class ResearchLoopController {
    readonly #workspace: InvestigationWorkspace;
    readonly #activity: AgentActivityHub;
    readonly #run: (
        workspace: InvestigationWorkspace,
        options: ResearchLoopOptions
    ) => Promise<ResearchLoopOutcome>;
    /** Built afresh for every loop, because the roster an investigation runs on can be moved. */
    readonly #harnesses: (() => readonly AgentHarness[]) | undefined;
    readonly #settings: LabSettingsReader | undefined;
    readonly #allowances: HarnessAllowanceReadings | undefined;
    #abortController: AbortController | undefined;
    #running: Promise<ResearchLoopOutcome> | undefined;
    #restartRequested = false;
    #unsubscribe: (() => void) | undefined;
    #resumeTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(
        workspace: InvestigationWorkspace,
        activity: AgentActivityHub,
        run: (
            workspace: InvestigationWorkspace,
            options: ResearchLoopOptions
        ) => Promise<ResearchLoopOutcome>,
        harnesses?: () => readonly AgentHarness[],
        settings?: LabSettingsReader,
        allowances?: HarnessAllowanceReadings
    ) {
        this.#workspace = workspace;
        this.#activity = activity;
        this.#run = run;
        this.#harnesses = harnesses;
        this.#settings = settings;
        this.#allowances = allowances;
        this.#unsubscribe = workspace.subscribe((event, snapshot) => {
            if (event.type !== EventType.INVESTIGATION_STATE_CHANGED) {
                return;
            }
            if (
                event.payload.state === InvestigationState.RUNNING &&
                snapshot.investigation.state === InvestigationState.RUNNING
            ) {
                this.start();
            }
            this.#armResume(snapshot);
        });
        /** A daemon that went down while an investigation slept still owes it the wake-up. */
        this.#armResume(workspace.getSnapshot());
    }

    start(): void {
        if (this.#workspace.getSnapshot().investigation.state !== InvestigationState.RUNNING) {
            return;
        }
        if (this.#running !== undefined) {
            this.#restartRequested = true;
            return;
        }
        const abortController = new AbortController();
        this.#abortController = abortController;
        const running = this.#run(this.#workspace, {
            activity: this.#activity,
            signal: abortController.signal,
            ...(this.#harnesses === undefined ? {} : { harnesses: this.#harnesses() }),
            ...(this.#settings === undefined ? {} : { settings: this.#settings }),
            ...(this.#allowances === undefined ? {} : { allowances: this.#allowances })
        });
        this.#running = running;
        const clear = () => {
            if (this.#running === running) {
                this.#running = undefined;
                this.#abortController = undefined;
                if (this.#restartRequested) {
                    this.#restartRequested = false;
                    this.start();
                }
            }
        };
        void running.then(clear, clear);
    }

    async cancel(reason: Error): Promise<void> {
        const running = this.#running;
        if (running === undefined) {
            return;
        }
        this.#restartRequested = false;
        this.#abortController?.abort(reason);
        try {
            await running;
        } catch {
            // A daemon shutdown or stop must still close transport and settle lifecycle state.
        }
    }

    /**
     * Puts the investigation on the work with what it dispatches to now. A loop reads the roster
     * once, when it starts, so the one in flight is given up rather than finished — the same cost as
     * a pause, and the only way a new harness reaches the next agent.
     *
     * An investigation the lab put to sleep with a date on it is sleeping on its allowances, and
     * pointing it somewhere else is the operator answering exactly that wait, so it goes back to
     * work now instead of at the reset it was holding out for. One that was paused, or that ran out
     * of directions, stays where the operator left it.
     */
    async redispatch(reason: Error): Promise<void> {
        if (this.#workspace.getSnapshot().investigation.state === InvestigationState.HIBERNATING) {
            await this.wakeIfWaitingOnAllowances(reason);
            return;
        }
        await this.cancel(reason);
        this.start();
    }

    /**
     * Gives an investigation the lab parked on its allowances another go at them, now rather than
     * at the reset it was holding out for. Only a sleep the lab dated is one it took on itself: an
     * investigation the operator paused, and one that ran out of directions, are left where they are.
     */
    async wakeIfWaitingOnAllowances(reason: Error): Promise<void> {
        const investigation = this.#workspace.getSnapshot().investigation;
        if (
            investigation.state !== InvestigationState.HIBERNATING ||
            investigation.resume_at === undefined
        ) {
            return;
        }
        await this.#workspace.wakeIfHibernating(reason.message, WakeTrigger.USER);
    }

    async close(reason: Error): Promise<void> {
        this.#unsubscribe?.();
        this.#unsubscribe = undefined;
        this.#clearResume();
        await this.cancel(reason);
    }

    /**
     * Holds the investigation to the moment it said it would be back. Only a sleep with a stated end
     * carries one — a subscription window that resets — so an investigation an operator paused is
     * left alone, and one that was woken, stopped or finished in the meantime drops its timer here
     * rather than reviving itself out of the state the operator left it in.
     */
    #armResume(snapshot: StatusSnapshot): void {
        this.#clearResume();
        const resumeAt = snapshot.investigation.resume_at;
        if (
            snapshot.investigation.state !== InvestigationState.HIBERNATING ||
            resumeAt === undefined
        ) {
            return;
        }

        const waitMs = Date.parse(resumeAt) - Date.now();
        if (Number.isNaN(waitMs)) {
            return;
        }
        if (waitMs <= 0) {
            void this.#workspace.wakeIfHibernating(RESUME_REASON, WakeTrigger.ALLOWANCE);
            return;
        }
        this.#resumeTimer = setTimeout(
            () => this.#armResume(this.#workspace.getSnapshot()),
            Math.min(waitMs, RESUME_STEP_MS)
        );
    }

    #clearResume(): void {
        if (this.#resumeTimer !== undefined) {
            clearTimeout(this.#resumeTimer);
            this.#resumeTimer = undefined;
        }
    }
}
