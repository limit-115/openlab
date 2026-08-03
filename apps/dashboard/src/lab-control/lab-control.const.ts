import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { CircleStopIcon, PlayIcon } from "lucide-react";
import type { LabControlPresentation } from "#src/lab-control/lab-control.types";

export const LabControlAction = {
    WAKE: "WAKE",
    STOP: "STOP"
} as const;
export type LabControlAction = (typeof LabControlAction)[keyof typeof LabControlAction];

export const LAB_CONTROL_ENDPOINT: Record<LabControlAction, string> = {
    [LabControlAction.WAKE]: "/api/wake",
    [LabControlAction.STOP]: "/api/stop"
};

/**
 * The states each control acts from, mirroring the lifecycle guard the daemon enforces so the header
 * never offers a transition the run would refuse.
 */
export const LAB_CONTROL_ORIGIN_STATES: Record<LabControlAction, ReadonlySet<LabState>> = {
    [LabControlAction.WAKE]: new Set([LabState.HIBERNATING]),
    [LabControlAction.STOP]: new Set([LabState.RUNNING, LabState.HIBERNATING])
};

export const LAB_CONTROL_PRESENTATION: Record<LabControlAction, LabControlPresentation> = {
    [LabControlAction.WAKE]: {
        label: "Wake",
        pendingLabel: "Waking",
        icon: PlayIcon,
        tone: "default"
    },
    [LabControlAction.STOP]: {
        label: "Stop",
        pendingLabel: "Stopping",
        icon: CircleStopIcon,
        tone: "destructive",
        confirmation: {
            title: "Stop the run for good?",
            consequence:
                "The agents are cancelled and the lab settles as stopped. A stopped lab cannot be started again, so anything unfinished stays unfinished.",
            confirmLabel: "Stop the run"
        }
    }
};

export const KEEP_RUN_LABEL = "Keep running" as const;

/** Shown when the daemon is gone, which reads nothing like a refusal the operator can act on. */
export const LAB_CONTROL_UNREACHABLE = "The lab daemon did not answer." as const;

/**
 * The controls float over the corner of the page instead of sitting in the header. Ending a run is
 * something the operator reaches for a few times a session, and it was crowding a header whose job
 * is to say where you are and how the lab is doing.
 */
export const LAB_CONTROL_DOCK =
    "fixed right-4 bottom-4 z-30 flex flex-col items-end gap-1.5 sm:right-6 lg:right-12" as const;

/** Chrome of its own, because the island lies over whatever the page happens to be showing. */
export const LAB_CONTROL_GROUP =
    "flex flex-wrap items-center justify-end gap-2 rounded-4xl border bg-background/85 p-1.5 shadow-lg backdrop-blur-lg" as const;

export const LAB_CONTROL_FAILURE =
    "rounded-2xl border bg-background/85 px-3 py-1.5 text-sm text-destructive shadow-lg backdrop-blur-lg" as const;
