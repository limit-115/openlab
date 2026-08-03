import {
    LabState,
    type LabState as LabStateValue
} from "@lab/protocol/lab-lifecycle/lab-state.const";

/**
 * A breakthrough pauses the lab rather than ending it: the team reads the confirmed finding and
 * decides whether there is more to get out of the same goal, so RUNNING stays reachable from it.
 * Stopping settles a run rather than burying it, and the operator who settled it is the one who
 * decides there is more to ask of the same goal, so RUNNING stays reachable from STOPPED too.
 * Only a failure is final: the lab ended up somewhere it could not reason its way out of, and
 * resuming into that would resume the reason it stopped making sense.
 */
export const legalLabStateTransitions: Readonly<Record<LabStateValue, ReadonlySet<LabStateValue>>> =
    {
        [LabState.RUNNING]: new Set([
            LabState.BREAKTHROUGH,
            LabState.HIBERNATING,
            LabState.STOPPED,
            LabState.FAILED
        ]),
        [LabState.BREAKTHROUGH]: new Set([LabState.RUNNING, LabState.STOPPED, LabState.FAILED]),
        [LabState.HIBERNATING]: new Set([LabState.RUNNING, LabState.STOPPED, LabState.FAILED]),
        [LabState.STOPPED]: new Set([LabState.RUNNING]),
        [LabState.FAILED]: new Set()
    };
