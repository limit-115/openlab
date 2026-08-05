import type {
    CommitRuntimeInput,
    CommitRuntimeResult,
    InitializeRuntimeInput,
    PersistedInvestigationEvent,
    PersistedRuntime,
    RuntimeCheckpoint
} from "@lab/db/runtime/runtime-persistence.types";
import type { InvestigationInput } from "@lab/protocol/investigation-input/investigation-input.types";

interface HeldRuntime {
    task: InvestigationInput;
    workspacePath: string;
    checkpoint: RuntimeCheckpoint;
}

/**
 * The database as far as the registry is concerned: many investigations, each with a checkpoint
 * and an event log. It keeps the revision discipline of the real one, so a stale write still fails.
 */
export class InMemoryRuntime {
    readonly #runtimes = new Map<string, HeldRuntime>();
    readonly #events: PersistedInvestigationEvent[] = [];

    async initialize(input: InitializeRuntimeInput): Promise<CommitRuntimeResult> {
        const investigationId = input.snapshot.investigation.id;
        if (this.#runtimes.has(investigationId)) {
            throw new Error(`Runtime ${investigationId} is already initialized`);
        }
        this.#runtimes.set(investigationId, {
            task: structuredClone(input.task),
            workspacePath: input.workspacePath,
            checkpoint: { snapshot: structuredClone(input.snapshot), revision: 0 }
        });
        return this.#store(investigationId, input.snapshot, 1, input.event);
    }

    async load(investigationId: string): Promise<PersistedRuntime | undefined> {
        const runtime = this.#runtimes.get(investigationId);
        return runtime === undefined ? undefined : this.#toPersisted(runtime);
    }

    async commit(input: CommitRuntimeInput): Promise<CommitRuntimeResult> {
        const investigationId = input.snapshot.investigation.id;
        const runtime = this.#runtimes.get(investigationId);
        if (runtime?.checkpoint.revision !== input.expectedRevision) {
            throw new Error(`Unexpected runtime revision ${input.expectedRevision}`);
        }
        return this.#store(
            investigationId,
            input.snapshot,
            input.expectedRevision + 1,
            input.event
        );
    }

    async retask(investigationId: string, task: InvestigationInput): Promise<InvestigationInput> {
        const runtime = this.#runtimes.get(investigationId);
        if (runtime === undefined || runtime.task.goal !== task.goal) {
            throw new Error(`Runtime ${investigationId} does not exist under that goal`);
        }
        runtime.task = structuredClone(task);
        return structuredClone(runtime.task);
    }

    async eventsAfter(
        investigationId: string,
        afterSequence = 0,
        limit = 200
    ): Promise<PersistedInvestigationEvent[]> {
        return structuredClone(
            this.#events
                .filter(
                    (event) =>
                        event.investigation_id === investigationId && event.sequence > afterSequence
                )
                .slice(0, limit)
        );
    }

    async listPersisted(limit = 100): Promise<PersistedRuntime[]> {
        return [...this.#runtimes.values()]
            .slice(0, limit)
            .map((runtime) => this.#toPersisted(runtime));
    }

    async delete(investigationId: string): Promise<boolean> {
        return this.#runtimes.delete(investigationId);
    }

    #toPersisted(runtime: HeldRuntime): PersistedRuntime {
        return {
            task: structuredClone(runtime.task),
            workspacePath: runtime.workspacePath,
            checkpoint: structuredClone(runtime.checkpoint),
            persistedAt: runtime.checkpoint.snapshot.investigation.updated_at
        };
    }

    #store(
        investigationId: string,
        snapshot: RuntimeCheckpoint["snapshot"],
        revision: number,
        event?: InitializeRuntimeInput["event"]
    ): CommitRuntimeResult {
        const runtime = this.#runtimes.get(investigationId);
        if (runtime === undefined) {
            throw new Error(`Runtime ${investigationId} does not exist`);
        }
        const appendedEvent =
            event === undefined ? undefined : { ...event, sequence: this.#events.length + 1 };
        if (appendedEvent !== undefined) {
            this.#events.push(appendedEvent);
        }
        const checkpoint: RuntimeCheckpoint = {
            snapshot: structuredClone(snapshot),
            revision,
            ...(appendedEvent === undefined ? {} : { lastEventSequence: appendedEvent.sequence })
        };
        runtime.checkpoint = checkpoint;
        return {
            ...structuredClone(checkpoint),
            ...(appendedEvent === undefined ? {} : { appendedEvent })
        };
    }
}
