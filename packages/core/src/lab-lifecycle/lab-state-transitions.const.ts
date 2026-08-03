import {
    LabState,
    type LabState as LabStateValue
} from "@lab/protocol/lab-lifecycle/lab-state.const";

/**
 * A breakthrough pauses the lab rather than ending it: the team reads the confirmed finding and
 * decides whether there is more to get out of the same goal, so RUNNING stays reachable from it.
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
        [LabState.STOPPED]: new Set(),
        [LabState.FAILED]: new Set()
    };
