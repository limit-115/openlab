import type { LabState } from "@lab/protocol/schemas";

export type WakeTrigger = "capability" | "evidence" | "model" | "tool" | "user";

export interface CompletionEvidence {
    readonly resultStatement: string;
    readonly supportingEvidenceIds: readonly string[];
    readonly independentVerifierVerdictId?: string;
    readonly limitations: readonly string[];
    readonly knownCounterexamples: readonly string[];
    readonly reportPath?: string;
    readonly resultPath?: string;
}

export interface LifecycleContext {
    readonly completion?: CompletionEvidence;
    readonly plateauConfirmed?: boolean;
    readonly wakeTrigger?: WakeTrigger;
    readonly failureReason?: string;
}

export interface LifecycleDecision {
    readonly allowed: boolean;
    readonly reasons: readonly string[];
}

const legalTransitions: Readonly<Record<LabState, ReadonlySet<LabState>>> = {
    RUNNING: new Set(["HIBERNATING", "COMPLETED", "STOPPED", "FAILED"]),
    HIBERNATING: new Set(["RUNNING", "STOPPED", "FAILED"]),
    COMPLETED: new Set(),
    STOPPED: new Set(),
    FAILED: new Set()
};

export function assessLifecycleTransition(
    current: LabState,
    target: LabState,
    context: LifecycleContext = {}
): LifecycleDecision {
    const reasons: string[] = [];

    if (!legalTransitions[current].has(target)) {
        reasons.push(`Illegal lifecycle transition: ${current} -> ${target}`);
    }

    if (target === "COMPLETED") {
        reasons.push(...validateCompletion(context.completion));
    }

    if (target === "HIBERNATING" && context.plateauConfirmed !== true) {
        reasons.push("Hibernation requires a confirmed plateau");
    }

    if (current === "HIBERNATING" && target === "RUNNING" && context.wakeTrigger === undefined) {
        reasons.push("Waking a hibernating lab requires a trigger");
    }

    if (
        target === "FAILED" &&
        (context.failureReason === undefined || context.failureReason.trim().length === 0)
    ) {
        reasons.push("Failure requires a non-empty reason");
    }

    return { allowed: reasons.length === 0, reasons };
}

export function transitionLabState(
    current: LabState,
    target: LabState,
    context: LifecycleContext = {}
): LabState {
    const decision = assessLifecycleTransition(current, target, context);
    if (!decision.allowed) {
        throw new Error(decision.reasons.join("; "));
    }
    return target;
}

function validateCompletion(completion: CompletionEvidence | undefined): string[] {
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
