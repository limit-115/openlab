import {
    InvestigationState,
    type InvestigationState as InvestigationStateValue
} from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import { legalInvestigationStateTransitions } from "#src/investigation-lifecycle/investigation-state-transitions.const";
import type {
    LifecycleContext,
    LifecycleDecision
} from "#src/investigation-lifecycle/investigation-state-transitions.types";

export function assessLifecycleTransition(
    current: InvestigationStateValue,
    target: InvestigationStateValue,
    context: LifecycleContext = {}
): LifecycleDecision {
    const reasons: string[] = [];

    if (!legalInvestigationStateTransitions[current].has(target)) {
        reasons.push(`Illegal lifecycle transition: ${current} -> ${target}`);
    }

    /**
     * The one judgement the investigation may not make about itself. A researcher is free to believe anything
     * about its own work; only a verifier's confirmation turns that belief into a result.
     */
    if (
        target === InvestigationState.BREAKTHROUGH &&
        (context.confirmedFindingId === undefined || context.confirmedFindingId.trim().length === 0)
    ) {
        reasons.push("A breakthrough requires the finding a verifier confirmed");
    }

    /**
     * An investigation only ever reaches RUNNING by being resumed, because the state it starts in is the one
     * it is born with. Every such return names what revived it, so the run's history says whether
     * a person or an answered capability put it back to work.
     */
    if (target === InvestigationState.RUNNING && context.wakeTrigger === undefined) {
        reasons.push("Resuming an investigation requires a trigger");
    }

    if (
        target === InvestigationState.FAILED &&
        (context.failureReason === undefined || context.failureReason.trim().length === 0)
    ) {
        reasons.push("Failure requires a non-empty reason");
    }

    return { allowed: reasons.length === 0, reasons };
}

export function transitionInvestigationState(
    current: InvestigationStateValue,
    target: InvestigationStateValue,
    context: LifecycleContext = {}
): InvestigationStateValue {
    const decision = assessLifecycleTransition(current, target, context);
    if (!decision.allowed) {
        throw new Error(decision.reasons.join("; "));
    }
    return target;
}
