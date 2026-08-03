import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";

export interface PersistedLabEvent extends LabEvent {
    readonly sequence: number;
}

export interface RuntimeCheckpoint {
    readonly snapshot: StatusSnapshot;
    readonly revision: number;
    readonly lastEventSequence?: number;
}

export interface PersistedRuntime {
    readonly task: TaskInput;
    readonly workspacePath: string;
    readonly checkpoint: RuntimeCheckpoint;
    readonly persistedAt: string;
}

export type RecoverableRuntime = PersistedRuntime;

export interface InitializeRuntimeInput {
    readonly task: TaskInput;
    readonly workspacePath: string;
    readonly snapshot: StatusSnapshot;
    readonly event?: LabEvent;
}

export interface CommitRuntimeInput {
    readonly snapshot: StatusSnapshot;
    readonly expectedRevision: number;
    readonly event?: LabEvent;
}

export interface CommitRuntimeResult extends RuntimeCheckpoint {
    readonly appendedEvent?: PersistedLabEvent;
}
