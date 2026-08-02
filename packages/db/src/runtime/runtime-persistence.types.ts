import type { Evidence, LabEvent, TaskInput } from "@lab/protocol/schemas";
import type { StatusSnapshot } from "@lab/protocol/status";

export interface PersistedLabEvent extends LabEvent {
    readonly sequence: number;
}

export interface RuntimeCheckpoint {
    readonly snapshot: StatusSnapshot;
    readonly evidence: Evidence[];
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
    readonly evidence?: readonly Evidence[];
    readonly event?: LabEvent;
}

export interface CommitRuntimeInput {
    readonly snapshot: StatusSnapshot;
    readonly evidence?: readonly Evidence[];
    readonly expectedRevision: number;
    readonly event?: LabEvent;
}

export interface CommitRuntimeResult extends RuntimeCheckpoint {
    readonly appendedEvent?: PersistedLabEvent;
}
