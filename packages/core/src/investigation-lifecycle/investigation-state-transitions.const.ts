import {
    InvestigationState,
    type InvestigationState as InvestigationStateValue
} from "@openlab/protocol/investigation-lifecycle/investigation-state.const";

/**
 * A breakthrough pauses the investigation rather than ending it: the team reads the confirmed finding and
 * decides whether there is more to get out of the same goal, so RUNNING stays reachable from it.
 * Stopping settles a run rather than burying it, and the operator who settled it is the one who
 * decides there is more to ask of the same goal, so RUNNING stays reachable from STOPPED too.
 * Only a failure is final: the investigation ended up somewhere it could not reason its way out of, and
 * resuming into that would resume the reason it stopped making sense.
 */
export const legalInvestigationStateTransitions: Readonly<
    Record<InvestigationStateValue, ReadonlySet<InvestigationStateValue>>
> = {
    [InvestigationState.RUNNING]: new Set([
        InvestigationState.BREAKTHROUGH,
        InvestigationState.HIBERNATING,
        InvestigationState.STOPPED,
        InvestigationState.FAILED
    ]),
    [InvestigationState.BREAKTHROUGH]: new Set([
        InvestigationState.RUNNING,
        InvestigationState.STOPPED,
        InvestigationState.FAILED
    ]),
    [InvestigationState.HIBERNATING]: new Set([
        InvestigationState.RUNNING,
        InvestigationState.STOPPED,
        InvestigationState.FAILED
    ]),
    [InvestigationState.STOPPED]: new Set([InvestigationState.RUNNING]),
    [InvestigationState.FAILED]: new Set()
};
