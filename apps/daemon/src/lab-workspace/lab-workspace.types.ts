import type { RuntimePersistence } from "@lab/db/runtime/runtime-persistence";
import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import type { WorkspaceMutationAction } from "#src/lab-workspace/lab-workspace.const";

export type StatusListener = (event: LabEvent, snapshot: StatusSnapshot) => void;
export type SnapshotUpdater = (draft: StatusSnapshot) => void;

export type WorkspaceMutationUpdater = (
    draft: StatusSnapshot,
    event: LabEvent
) => WorkspaceMutationAction | undefined;

export interface WorkspaceMutationResult {
    readonly snapshot: StatusSnapshot;
    readonly event: LabEvent;
}

export type WorkspaceRuntimePersistence = Pick<
    RuntimePersistence,
    "initialize" | "load" | "commit" | "eventsAfter" | "listRecoverable"
>;

export interface VerifiedResult {
    summary: string;
    supportingEvidenceIds: readonly string[];
    independentVerifierVerdictId: string;
    limitations: readonly string[];
    knownCounterexamples: readonly string[];
}
