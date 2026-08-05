import type { RuntimePersistence } from "@openlab/db/runtime/runtime-persistence";
import type { InvestigationEvent } from "@openlab/protocol/investigation-events/investigation-event.types";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import type { WorkspaceMutationAction } from "#src/investigation-workspace/investigation-workspace.const";

export type StatusListener = (event: InvestigationEvent, snapshot: StatusSnapshot) => void;
export type SnapshotUpdater = (draft: StatusSnapshot) => void;

export type WorkspaceMutationUpdater = (
    draft: StatusSnapshot,
    event: InvestigationEvent
) => WorkspaceMutationAction | undefined;

export interface WorkspaceMutationResult {
    readonly snapshot: StatusSnapshot;
    readonly event: InvestigationEvent;
}

export type WorkspaceRuntimePersistence = Pick<
    RuntimePersistence,
    "initialize" | "load" | "commit" | "eventsAfter" | "retask"
>;

export interface VerifiedResult {
    summary: string;
    supportingEvidenceIds: readonly string[];
    independentVerifierVerdictId: string;
    limitations: readonly string[];
    knownCounterexamples: readonly string[];
}
