export interface RecordFindingInput {
    readonly assumptionId: string;
    readonly runId: string;
    readonly claim: string;
    readonly work: string;
    readonly artifactPaths: readonly string[];
}
