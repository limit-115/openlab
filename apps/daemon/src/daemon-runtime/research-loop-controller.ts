import type { AgentHarness } from "@lab/harness/agent-harness.types";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import type {
    ResearchLoopOptions,
    ResearchLoopOutcome
} from "#src/research-cycle/research-loop.types";
import type { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

export class ResearchLoopController {
    readonly #workspace: LabWorkspace;
    readonly #activity: AgentActivityHub;
    readonly #run: (
        workspace: LabWorkspace,
        options: ResearchLoopOptions
    ) => Promise<ResearchLoopOutcome>;
    readonly #harnesses: readonly AgentHarness[] | undefined;
    readonly #subscriptions: SubscriptionAllowanceReadings | undefined;
    #abortController: AbortController | undefined;
    #running: Promise<ResearchLoopOutcome> | undefined;
    #restartRequested = false;
    #unsubscribe: (() => void) | undefined;

    constructor(
        workspace: LabWorkspace,
        activity: AgentActivityHub,
        run: (
            workspace: LabWorkspace,
            options: ResearchLoopOptions
        ) => Promise<ResearchLoopOutcome>,
        harnesses?: readonly AgentHarness[],
        subscriptions?: SubscriptionAllowanceReadings
    ) {
        this.#workspace = workspace;
        this.#activity = activity;
        this.#run = run;
        this.#harnesses = harnesses;
        this.#subscriptions = subscriptions;
        this.#unsubscribe = workspace.subscribe((event, snapshot) => {
            if (
                event.type === EventType.LAB_STATE_CHANGED &&
                event.payload.state === LabState.RUNNING &&
                snapshot.lab.state === LabState.RUNNING
            ) {
                this.start();
            }
        });
    }

    start(): void {
        if (this.#workspace.getSnapshot().lab.state !== LabState.RUNNING) {
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
            ...(this.#harnesses === undefined ? {} : { harnesses: this.#harnesses }),
            ...(this.#subscriptions === undefined ? {} : { subscriptions: this.#subscriptions })
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

    async close(reason: Error): Promise<void> {
        this.#unsubscribe?.();
        this.#unsubscribe = undefined;
        await this.cancel(reason);
    }
}
