import type { ExecutionResult } from "@lab/executor/types";
import type { ValidatedArtifact } from "#src/artifact-integrity/file-artifact";

export interface OutcomeExecution {
    readonly experimentId: string;
    readonly result: ExecutionResult;
    readonly artifacts: readonly ValidatedArtifact[];
}
