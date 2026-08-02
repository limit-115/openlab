import type { CompletionEvidence } from "#src/lab-lifecycle/completion-evidence.types";

export function validateCompletion(completion: CompletionEvidence | undefined): string[] {
    if (completion === undefined) {
        return ["Completion evidence is required"];
    }

    const reasons: string[] = [];
    if (completion.resultStatement.trim().length === 0) {
        reasons.push("Completion requires a clear result statement");
    }
    if (completion.supportingEvidenceIds.length === 0) {
        reasons.push("Completion requires supporting evidence");
    }
    if (
        completion.independentVerifierVerdictId === undefined ||
        completion.independentVerifierVerdictId.trim().length === 0
    ) {
        reasons.push("Completion requires an independent verifier verdict");
    }
    if (completion.reportPath === undefined || completion.reportPath.trim().length === 0) {
        reasons.push("Completion requires report.md");
    }
    if (completion.resultPath === undefined || completion.resultPath.trim().length === 0) {
        reasons.push("Completion requires result.json");
    }

    return reasons;
}
