import {
    LabState,
    type LabState as LabStateValue
} from "@lab/protocol/lab-lifecycle/lab-state.const";
import { validateCompletion } from "#src/lab-lifecycle/completion-evidence";
import { legalLabStateTransitions } from "#src/lab-lifecycle/lab-state-transitions.const";
import type {
    LifecycleContext,
    LifecycleDecision
} from "#src/lab-lifecycle/lab-state-transitions.types";

export function assessLifecycleTransition(
    current: LabStateValue,
    target: LabStateValue,
    context: LifecycleContext = {}
): LifecycleDecision {
    const reasons: string[] = [];

    if (!legalLabStateTransitions[current].has(target)) {
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
