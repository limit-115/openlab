import { EventType, LabState } from "@lab/protocol/constants";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import type {
    ResearchLoopOptions,
    ResearchLoopOutcome
} from "#src/research-cycle/research-loop.types";

export class ResearchLoopController {
    readonly #workspace: LabWorkspace;
    readonly #run: (
        workspace: LabWorkspace,
        options: ResearchLoopOptions
    ) => Promise<ResearchLoopOutcome>;
    #abortController: AbortController | undefined;
    #running: Promise<ResearchLoopOutcome> | undefined;
    #restartRequested = false;
    #unsubscribe: (() => void) | undefined;

    constructor(
        workspace: LabWorkspace,
        run: (workspace: LabWorkspace, options: ResearchLoopOptions) => Promise<ResearchLoopOutcome>
    ) {
        this.#workspace = workspace;
        this.#run = run;
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
        const running = this.#run(this.#workspace, { signal: abortController.signal });
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
