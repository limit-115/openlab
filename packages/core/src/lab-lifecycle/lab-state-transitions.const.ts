import {
    LabState,
    type LabState as LabStateValue
} from "@lab/protocol/lab-lifecycle/lab-state.const";

export const legalLabStateTransitions: Readonly<Record<LabStateValue, ReadonlySet<LabStateValue>>> =
    {
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
