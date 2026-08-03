import type { ValidatedArtifact } from "#src/artifact-integrity/file-artifact";

export interface AgentArtifactSnapshot {
    /** Daemon-owned immutable copies, in the order their declared paths were accepted. */
    readonly artifacts: readonly ValidatedArtifact[];
    /** Why a declared path produced no snapshot, one entry per rejected path. */
    readonly issues: readonly string[];
}
