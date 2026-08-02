import { LabState, type LabState as LabStateValue } from "@lab/protocol/constants";
import type { WakeTrigger } from "#src/constants";

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

const legalTransitions: Readonly<Record<LabStateValue, ReadonlySet<LabStateValue>>> = {
    [LabState.RUNNING]: new Set([
        LabState.HIBERNATING,
        LabState.COMPLETED,
        LabState.STOPPED,
        LabState.FAILED
    ]),
    [LabState.HIBERNATING]: new Set([LabState.RUNNING, LabState.STOPPED, LabState.FAILED]),
    [LabState.COMPLETED]: new Set(),
    [LabState.STOPPED]: new Set(),
    [LabState.FAILED]: new Set()
};

export function assessLifecycleTransition(
    current: LabStateValue,
    target: LabStateValue,
    context: LifecycleContext = {}
): LifecycleDecision {
    const reasons: string[] = [];

    if (!legalTransitions[current].has(target)) {
        reasons.push(`Illegal lifecycle transition: ${current} -> ${target}`);
    }

    if (target === LabState.COMPLETED) {
        reasons.push(...validateCompletion(context.completion));
    }

    if (target === LabState.HIBERNATING && context.plateauConfirmed !== true) {
        reasons.push("Hibernation requires a confirmed plateau");
    }

    if (
        current === LabState.HIBERNATING &&
        target === LabState.RUNNING &&
        context.wakeTrigger === undefined
    ) {
        reasons.push("Waking a hibernating lab requires a trigger");
    }

    if (
        target === LabState.FAILED &&
        (context.failureReason === undefined || context.failureReason.trim().length === 0)
    ) {
        reasons.push("Failure requires a non-empty reason");
    }

    return { allowed: reasons.length === 0, reasons };
}

export function transitionLabState(
    current: LabStateValue,
    target: LabStateValue,
    context: LifecycleContext = {}
): LabStateValue {
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
