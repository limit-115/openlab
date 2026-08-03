import type { HarnessEvent } from "@lab/harness/harness-event.types";
import {
    AgentActivityPhase,
    AgentActivityPhaseByFrameKind
} from "@lab/protocol/agent-activity/agent-activity.const";
import type {
    AgentActivity,
    AgentRunIdentity
} from "@lab/protocol/agent-activity/agent-activity.types";
import { AgentActivityFrameKind } from "@lab/protocol/agent-activity/agent-activity-frame.const";
import type { AgentActivityFrame } from "@lab/protocol/agent-activity/agent-activity-frame.types";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { ACTIVITY_RETAINED_RUNS } from "#src/agent-activity/agent-activity.const";
import type {
    AgentActivityListener,
    AgentActivityRun
} from "#src/agent-activity/agent-activity-hub.types";
import { HarnessEventTranslator } from "#src/agent-activity/harness-event-translation";

/**
 * The live plane of agent work: who is running, and what each of them is doing right now.
 *
 * It is deliberately not the lab event log. That log is the durable research record, and committing
 * a snapshot revision per token of harness output would starve the research loop. Nothing is lost by
 * keeping this in memory: every frame here was written to the run's events.jsonl before it was
 * broadcast, so history is replayed from disk rather than buffered. The one exception is the frame
 * that ends a run, which no run can write into the file it is hashing; the replay reads that one
 * back from the manifest instead.
 */
export class AgentActivityHub {
    readonly #runs = new Map<string, AgentActivity>();
    readonly #listeners = new Set<AgentActivityListener>();

    startRun(identity: AgentRunIdentity): AgentActivityRun {
        this.#runs.set(identity.run_id, {
            ...identity,
            session_id: null,
            phase: AgentActivityPhase.STARTING,
            status: AgentRunStatus.RUNNING,
            usage: null,
            error: null,
            updated_at: identity.started_at
        });
        this.evictFinishedRuns();
        return new HubAgentActivityRun(identity, (frame) => this.record(frame));
    }

    /** Every retained run, most recently active first. */
    roster(): AgentActivity[] {
        return [...this.#runs.values()].sort((left, right) =>
            right.updated_at.localeCompare(left.updated_at)
        );
    }

    subscribe(listener: AgentActivityListener): () => void {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    }

    private record(frame: AgentActivityFrame): void {
        const activity = this.apply(frame);
        if (activity === undefined) {
            return;
        }
        for (const listener of this.#listeners) {
            listener(frame, activity);
        }
    }

    private apply(frame: AgentActivityFrame): AgentActivity | undefined {
        const current = this.#runs.get(frame.run_id);
        if (current === undefined) {
            return undefined;
        }

        const phase = AgentActivityPhaseByFrameKind[frame.kind];
        const updated: AgentActivity = {
            ...current,
            ...(phase === null ? {} : { phase }),
            ...(frame.kind === AgentActivityFrameKind.RUN_STARTED
                ? { session_id: frame.session_id }
                : {}),
            ...(frame.kind === AgentActivityFrameKind.USAGE ? { usage: frame.usage } : {}),
            ...(frame.kind === AgentActivityFrameKind.RUN_FINISHED
                ? { status: frame.status, error: frame.error }
                : {}),
            updated_at: frame.occurred_at
        };
        this.#runs.set(frame.run_id, updated);
        return updated;
    }

    private evictFinishedRuns(): void {
        if (this.#runs.size <= ACTIVITY_RETAINED_RUNS) {
            return;
        }
        const finished = [...this.#runs.values()]
            .filter(({ status }) => status !== AgentRunStatus.RUNNING)
            .sort((left, right) => left.updated_at.localeCompare(right.updated_at));
        for (const activity of finished) {
            if (this.#runs.size <= ACTIVITY_RETAINED_RUNS) {
                return;
            }
            this.#runs.delete(activity.run_id);
        }
    }
}

class HubAgentActivityRun implements AgentActivityRun {
    readonly #translator: HarnessEventTranslator;
    readonly #identity: AgentRunIdentity;
    readonly #record: (frame: AgentActivityFrame) => void;
    #lastSequence = 0;
    #finished = false;

    constructor(identity: AgentRunIdentity, record: (frame: AgentActivityFrame) => void) {
        this.#identity = identity;
        this.#translator = new HarnessEventTranslator(identity);
        this.#record = record;
    }

    publish(event: HarnessEvent): void {
        this.#lastSequence = Math.max(this.#lastSequence, event.sequence);
        const frame = this.#translator.translate(event);
        if (frame === undefined) {
            return;
        }
        if (frame.kind === AgentActivityFrameKind.RUN_FINISHED) {
            this.#finished = true;
        }
        this.#record(frame);
    }

    abandon(error: string): void {
        if (this.#finished) {
            return;
        }
        this.#finished = true;
        this.#lastSequence += 1;
        this.#record({
            run_id: this.#identity.run_id,
            sequence: this.#lastSequence,
            occurred_at: new Date().toISOString(),
            kind: AgentActivityFrameKind.RUN_FINISHED,
            status: AgentRunStatus.FAILED,
            error
        });
    }
}
