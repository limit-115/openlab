import { InvestigationState } from "@nightlab/protocol/investigation-lifecycle/investigation-state.const";
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

/** The transition each control asks for. Three of them are the same one, asked from three states. */
export const INVESTIGATION_CONTROL_TRANSITION: Record<InvestigationControlAction, string> = {
    [InvestigationControlAction.PAUSE]: "pause",
    [InvestigationControlAction.WAKE]: "wake",
    [InvestigationControlAction.RESUME]: "wake",
    [InvestigationControlAction.START]: "wake",
    [InvestigationControlAction.STOP]: "stop"
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
        label: "pause",
        pendingLabel: "pausing",
        icon: PauseIcon,
        tone: "outline"
    },
    [InvestigationControlAction.WAKE]: {
        label: "wake",
        pendingLabel: "waking",
        icon: PlayIcon,
        tone: "default"
    },
    [InvestigationControlAction.RESUME]: {
        label: "resume",
        pendingLabel: "resuming",
        icon: PlayIcon,
        tone: "default"
    },
    [InvestigationControlAction.START]: {
        label: "start",
        pendingLabel: "starting",
        icon: PlayIcon,
        tone: "default"
    },
    [InvestigationControlAction.STOP]: {
        label: "stop",
        pendingLabel: "stopping",
        icon: CircleStopIcon,
        tone: "destructive",
        confirmation: {
            title: "stopTitle",
            consequence: "stopConsequence",
            confirmLabel: "stopConfirm"
        }
    }
};

/**
 * The controls stand beside the views of the investigation they act on, because the page that opens
 * a run is the only place it can be steered from. A refusal stands under them rather than beside
 * them, so the daemon's own words are never squeezed into what is left of the row.
 */
export const INVESTIGATION_CONTROL_GROUP = "flex flex-col gap-1.5" as const;

export const INVESTIGATION_CONTROL_ACTIONS = "flex flex-wrap items-center gap-2" as const;

export const INVESTIGATION_CONTROL_FAILURE = "text-sm text-destructive" as const;
