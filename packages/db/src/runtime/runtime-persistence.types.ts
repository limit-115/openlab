import type { InvestigationEvent } from "@lab/protocol/investigation-events/investigation-event.types";
import type { InvestigationInput } from "@lab/protocol/investigation-input/investigation-input.types";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";

export interface PersistedInvestigationEvent extends InvestigationEvent {
    readonly sequence: number;
}

export interface RuntimeCheckpoint {
    readonly snapshot: StatusSnapshot;
    readonly revision: number;
    readonly lastEventSequence?: number;
}

export interface PersistedRuntime {
    readonly task: InvestigationInput;
    readonly workspacePath: string;
    readonly checkpoint: RuntimeCheckpoint;
    readonly persistedAt: string;
}

export type RecoverableRuntime = PersistedRuntime;

export interface InitializeRuntimeInput {
    readonly task: InvestigationInput;
    readonly workspacePath: string;
    readonly snapshot: StatusSnapshot;
    readonly event?: InvestigationEvent;
}

export interface CommitRuntimeInput {
    readonly snapshot: StatusSnapshot;
    readonly expectedRevision: number;
    readonly event?: InvestigationEvent;
}

export interface CommitRuntimeResult extends RuntimeCheckpoint {
    readonly appendedEvent?: PersistedInvestigationEvent;
}
