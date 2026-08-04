import type { AgentHarness } from "@lab/harness/agent-harness.types";
import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import type { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import type {
    ResearchLoopOptions,
    ResearchLoopOutcome
} from "#src/research-cycle/research-loop.types";
import type { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

export class ResearchLoopController {
    readonly #workspace: InvestigationWorkspace;
    readonly #activity: AgentActivityHub;
    readonly #run: (
        workspace: InvestigationWorkspace,
        options: ResearchLoopOptions
    ) => Promise<ResearchLoopOutcome>;
    readonly #harnesses: readonly AgentHarness[] | undefined;
    readonly #subscriptions: SubscriptionAllowanceReadings | undefined;
    #abortController: AbortController | undefined;
    #running: Promise<ResearchLoopOutcome> | undefined;
    #restartRequested = false;
    #unsubscribe: (() => void) | undefined;

    constructor(
        workspace: InvestigationWorkspace,
        activity: AgentActivityHub,
        run: (
            workspace: InvestigationWorkspace,
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
                event.type === EventType.INVESTIGATION_STATE_CHANGED &&
                event.payload.state === InvestigationState.RUNNING &&
                snapshot.investigation.state === InvestigationState.RUNNING
            ) {
                this.start();
            }
        });
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
