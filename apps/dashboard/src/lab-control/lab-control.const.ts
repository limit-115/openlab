import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { CircleStopIcon, PauseIcon, PlayIcon } from "lucide-react";
import type { LabControlPresentation } from "#src/lab-control/lab-control.types";

/**
 * Putting the lab back to work is one transition, but it is not one thing to ask for: waking a
 * sleeping lab, carrying a breakthrough further and starting a settled run again are different
 * decisions, and a control named for the state it acts from says which one the operator is making.
 */
export const LabControlAction = {
    PAUSE: "PAUSE",
    WAKE: "WAKE",
    RESUME: "RESUME",
    START: "START",
    STOP: "STOP"
} as const;
export type LabControlAction = (typeof LabControlAction)[keyof typeof LabControlAction];

export const LAB_CONTROL_ENDPOINT: Record<LabControlAction, string> = {
    [LabControlAction.PAUSE]: "/api/pause",
    [LabControlAction.WAKE]: "/api/wake",
    [LabControlAction.RESUME]: "/api/wake",
    [LabControlAction.START]: "/api/wake",
    [LabControlAction.STOP]: "/api/stop"
};

/**
 * The states each control acts from, mirroring the lifecycle guard the daemon enforces so the island
 * never offers a transition the run would refuse. Every state a run can leave offers a way out of
 * it; only a failure is left with none, because it is the one state the lab refuses to reopen.
 */
export const LAB_CONTROL_ORIGIN_STATES: Record<LabControlAction, ReadonlySet<LabState>> = {
    [LabControlAction.PAUSE]: new Set([LabState.RUNNING]),
    [LabControlAction.WAKE]: new Set([LabState.HIBERNATING]),
    [LabControlAction.RESUME]: new Set([LabState.BREAKTHROUGH]),
    [LabControlAction.START]: new Set([LabState.STOPPED]),
    [LabControlAction.STOP]: new Set([
        LabState.RUNNING,
        LabState.HIBERNATING,
        LabState.BREAKTHROUGH
    ])
};

export const LAB_CONTROL_PRESENTATION: Record<LabControlAction, LabControlPresentation> = {
    [LabControlAction.PAUSE]: {
        label: "Pause",
        pendingLabel: "Pausing",
        icon: PauseIcon,
        tone: "outline"
    },
    [LabControlAction.WAKE]: {
        label: "Wake",
        pendingLabel: "Waking",
        icon: PlayIcon,
        tone: "default"
    },
    [LabControlAction.RESUME]: {
        label: "Resume",
        pendingLabel: "Resuming",
        icon: PlayIcon,
        tone: "default"
    },
    [LabControlAction.START]: {
        label: "Start",
        pendingLabel: "Starting",
        icon: PlayIcon,
        tone: "default"
    },
    [LabControlAction.STOP]: {
        label: "Stop",
        pendingLabel: "Stopping",
        icon: CircleStopIcon,
        tone: "destructive",
        confirmation: {
            title: "Stop the run?",
            consequence:
                "The agents are cancelled and whatever they had in hand is lost. The lab settles as stopped and keeps everything it already proved, so you can start it again from here.",
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
 * is to say where you are and how the lab is doing. The island keeps the same short offset at every
 * width: it belongs to the viewport corner, not to the column of text it happens to lie over.
 */
export const LAB_CONTROL_DOCK =
    "fixed right-4 bottom-4 z-30 flex flex-col items-end gap-1.5" as const;

/** Chrome of its own, because the island lies over whatever the page happens to be showing. */
export const LAB_CONTROL_GROUP =
    "flex flex-wrap items-center justify-end gap-2 rounded-4xl border bg-background/85 p-1.5 shadow-lg backdrop-blur-lg" as const;

export const LAB_CONTROL_FAILURE =
    "rounded-2xl border bg-background/85 px-3 py-1.5 text-sm text-destructive shadow-lg backdrop-blur-lg" as const;
