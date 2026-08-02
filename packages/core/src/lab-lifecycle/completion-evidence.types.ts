export interface CompletionEvidence {
    readonly resultStatement: string;
    readonly supportingEvidenceIds: readonly string[];
    readonly independentVerifierVerdictId?: string;
    readonly limitations: readonly string[];
    readonly knownCounterexamples: readonly string[];
    readonly reportPath?: string;
    readonly resultPath?: string;
}
