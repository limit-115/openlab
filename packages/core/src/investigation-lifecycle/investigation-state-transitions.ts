import {
    LabState,
    type LabState as LabStateValue
} from "@lab/protocol/lab-lifecycle/lab-state.const";
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

    /**
     * The one judgement the lab may not make about itself. A researcher is free to believe anything
     * about its own work; only a verifier's confirmation turns that belief into a result.
     */
    if (
        target === LabState.BREAKTHROUGH &&
        (context.confirmedFindingId === undefined || context.confirmedFindingId.trim().length === 0)
    ) {
        reasons.push("A breakthrough requires the finding a verifier confirmed");
    }

    /**
     * A lab only ever reaches RUNNING by being resumed, because the state it starts in is the one
     * it is born with. Every such return names what revived it, so the run's history says whether
     * a person or an answered capability put it back to work.
     */
    if (target === LabState.RUNNING && context.wakeTrigger === undefined) {
        reasons.push("Resuming a lab requires a trigger");
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
