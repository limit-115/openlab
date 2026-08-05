import type { AgentHarness } from "@openlab/harness/agent-harness.types";
import type { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import type { HarnessReadiness } from "@openlab/protocol/harness-readiness/harness-readiness.types";
import { createHarness, EVERY_HARNESS_KIND } from "#src/agent-harness/harness-factory";
import { readyHarness, unreadyHarness } from "#src/harness-readiness/harness-readiness";
import type { HarnessReadinessOptions } from "#src/harness-readiness/harness-readiness-checks.types";

/**
 * Asks every harness whether it could run right now, by running the same preflight a dispatch runs.
 * There is no second copy of the rule here: an answer this reports as ready is one an investigation
 * would have accepted, which is the only reason an operator can trust the page they set the lab up
 * on.
 *
 * Nothing is remembered between checks. A check is asked for by an operator watching for the moment
 * an install lands, and holding the answer from before they installed it is the one thing that would
 * make the page wrong.
 */
export class HarnessReadinessChecks {
    readonly #createHarness: (kind: AgentHarnessKind) => AgentHarness;
    readonly #now: () => number;
    readonly #running = new Map<AgentHarnessKind, Promise<HarnessReadiness>>();

    constructor(options: HarnessReadinessOptions = {}) {
        this.#createHarness = options.createHarness ?? createHarness;
        this.#now = options.now ?? Date.now;
    }

    checkAll(): Promise<HarnessReadiness[]> {
        return Promise.all(EVERY_HARNESS_KIND.map((kind) => this.check(kind)));
    }

    /**
     * One CLI conversation per harness at a time. A page that polls while a check is still running
     * joins that one rather than launching another: the checks spawn processes, and an operator with
     * two tabs open should not cost twice as many.
     */
    check(kind: AgentHarnessKind): Promise<HarnessReadiness> {
        const running = this.#running.get(kind);
        if (running !== undefined) {
            return running;
        }

        const check = this.#askHarness(kind).finally(() => this.#running.delete(kind));
        this.#running.set(kind, check);
        return check;
    }

    async #askHarness(kind: AgentHarnessKind): Promise<HarnessReadiness> {
        const checkedAt = new Date(this.#now()).toISOString();
        try {
            return readyHarness(await this.#createHarness(kind).preflight(), checkedAt);
        } catch (failure) {
            return unreadyHarness(kind, failure, checkedAt);
        }
    }
}
