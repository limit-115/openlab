import type { ValidatedArtifact } from "#src/artifact-integrity/file-artifact";

export const SourceFetchOutcome = {
    REJECTED: "rejected",
    SUCCEEDED: "succeeded"
} as const;
export type SourceFetchOutcome = (typeof SourceFetchOutcome)[keyof typeof SourceFetchOutcome];

export const SourceFetchLimits = {
    MAXIMUM_BODY_BYTES: 1_048_576,
    MAXIMUM_REDIRECTS: 5,
    TIMEOUT_MILLISECONDS: 10_000
} as const;

export interface SourceFetchRequest {
    readonly url: string;
    readonly artifactRoot: string;
    readonly artifactDirectory: string;
    readonly signal?: AbortSignal;
}

interface SourceFetchResultBase {
    readonly requestedUrl: string;
    readonly fetchedAt: string;
    readonly manifest: ValidatedArtifact;
}

export interface SourceFetchSuccess extends SourceFetchResultBase {
    readonly outcome: typeof SourceFetchOutcome.SUCCEEDED;
    readonly finalUrl: string;
    readonly httpStatus: number;
    readonly body: ValidatedArtifact;
}

export interface SourceFetchRejection extends SourceFetchResultBase {
    readonly outcome: typeof SourceFetchOutcome.REJECTED;
    readonly finalUrl?: string;
    readonly httpStatus?: number;
    readonly error: string;
}

export type SourceFetchResult = SourceFetchSuccess | SourceFetchRejection;
