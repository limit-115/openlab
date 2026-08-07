export interface RecordFindingInput {
    readonly leadId: string;
    readonly runId: string;
    readonly claim: string;
    readonly work: string;
    readonly artifactPaths: readonly string[];
}
