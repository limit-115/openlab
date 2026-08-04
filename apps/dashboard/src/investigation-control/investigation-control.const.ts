import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { CircleStopIcon, PauseIcon, PlayIcon } from "lucide-react";
import type { InvestigationControlPresentation } from "#src/investigation-control/investigation-control.types";

/**
 * Putting the investigation back to work is one transition, but it is not one thing to ask for: waking a
 * sleeping investigation, carrying a breakthrough further and starting a settled run again are different
 * decisions, and a control named for the state it acts from says which one the operator is making.
 */
export const InvestigationControlAction = {
    PAUSE: "PAUSE",
    WAKE: "WAKE",
    RESUME: "RESUME",
    START: "START",
    STOP: "STOP"
} as const;
export type InvestigationControlAction =
    (typeof InvestigationControlAction)[keyof typeof InvestigationControlAction];

export const INVESTIGATION_CONTROL_ENDPOINT: Record<InvestigationControlAction, string> = {
    [InvestigationControlAction.PAUSE]: "/api/pause",
    [InvestigationControlAction.WAKE]: "/api/wake",
    [InvestigationControlAction.RESUME]: "/api/wake",
    [InvestigationControlAction.START]: "/api/wake",
    [InvestigationControlAction.STOP]: "/api/stop"
};

/**
 * The states each control acts from, mirroring the lifecycle guard the daemon enforces so the island
 * never offers a transition the run would refuse. Every state a run can leave offers a way out of
 * it; only a failure is left with none, because it is the one state the investigation refuses to reopen.
 */
export const INVESTIGATION_CONTROL_ORIGIN_STATES: Record<
    InvestigationControlAction,
    ReadonlySet<InvestigationState>
> = {
    [InvestigationControlAction.PAUSE]: new Set([InvestigationState.RUNNING]),
    [InvestigationControlAction.WAKE]: new Set([InvestigationState.HIBERNATING]),
    [InvestigationControlAction.RESUME]: new Set([InvestigationState.BREAKTHROUGH]),
    [InvestigationControlAction.START]: new Set([InvestigationState.STOPPED]),
    [InvestigationControlAction.STOP]: new Set([
        InvestigationState.RUNNING,
        InvestigationState.HIBERNATING,
        InvestigationState.BREAKTHROUGH
    ])
};

export const INVESTIGATION_CONTROL_PRESENTATION: Record<
    InvestigationControlAction,
    InvestigationControlPresentation
> = {
    [InvestigationControlAction.PAUSE]: {
        label: "Pause",
        pendingLabel: "Pausing",
        icon: PauseIcon,
        tone: "outline"
    },
    [InvestigationControlAction.WAKE]: {
        label: "Wake",
        pendingLabel: "Waking",
        icon: PlayIcon,
        tone: "default"
    },
    [InvestigationControlAction.RESUME]: {
        label: "Resume",
        pendingLabel: "Resuming",
        icon: PlayIcon,
        tone: "default"
    },
    [InvestigationControlAction.START]: {
        label: "Start",
        pendingLabel: "Starting",
        icon: PlayIcon,
        tone: "default"
    },
    [InvestigationControlAction.STOP]: {
        label: "Stop",
        pendingLabel: "Stopping",
        icon: CircleStopIcon,
        tone: "destructive",
        confirmation: {
            title: "Stop the run?",
            consequence:
                "The agents are cancelled and whatever they had in hand is lost. The investigation settles as stopped and keeps everything it already proved, so you can start it again from here.",
            confirmLabel: "Stop the run"
        }
    }
};

export const KEEP_RUN_LABEL = "Keep running" as const;

/** Shown when the daemon is gone, which reads nothing like a refusal the operator can act on. */
export const INVESTIGATION_CONTROL_UNREACHABLE = "The lab daemon did not answer." as const;

/**
 * The controls float over the corner of the page instead of sitting in the header. Ending a run is
 * something the operator reaches for a few times a session, and it was crowding a header whose job
 * is to say where you are and how the investigation is doing. The island keeps the same short offset at every
 * width: it belongs to the viewport corner, not to the column of text it happens to lie over.
 */
export const INVESTIGATION_CONTROL_DOCK =
    "fixed right-4 bottom-4 z-30 flex flex-col items-end gap-1.5" as const;

/** Chrome of its own, because the island lies over whatever the page happens to be showing. */
export const INVESTIGATION_CONTROL_GROUP =
    "flex flex-wrap items-center justify-end gap-2 rounded-4xl border bg-background/85 p-1.5 shadow-lg backdrop-blur-lg" as const;

export const INVESTIGATION_CONTROL_FAILURE =
    "rounded-2xl border bg-background/85 px-3 py-1.5 text-sm text-destructive shadow-lg backdrop-blur-lg" as const;
