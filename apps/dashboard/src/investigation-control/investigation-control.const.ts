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

/**
 * How much weight a control carries where it stands. Only the one transition the investigation
 * cannot walk back is drawn apart from the rest, so the sidebar stays quiet until it matters.
 */
export const InvestigationControlTone = {
    ORDINARY: "ORDINARY",
    DESTRUCTIVE: "DESTRUCTIVE"
} as const;
export type InvestigationControlTone =
    (typeof InvestigationControlTone)[keyof typeof InvestigationControlTone];

export const INVESTIGATION_CONTROL_PRESENTATION: Record<
    InvestigationControlAction,
    InvestigationControlPresentation
> = {
    [InvestigationControlAction.PAUSE]: {
        label: "Pause",
        pendingLabel: "Pausing",
        icon: PauseIcon,
        tone: InvestigationControlTone.ORDINARY
    },
    [InvestigationControlAction.WAKE]: {
        label: "Wake",
        pendingLabel: "Waking",
        icon: PlayIcon,
        tone: InvestigationControlTone.ORDINARY
    },
    [InvestigationControlAction.RESUME]: {
        label: "Resume",
        pendingLabel: "Resuming",
        icon: PlayIcon,
        tone: InvestigationControlTone.ORDINARY
    },
    [InvestigationControlAction.START]: {
        label: "Start",
        pendingLabel: "Starting",
        icon: PlayIcon,
        tone: InvestigationControlTone.ORDINARY
    },
    [InvestigationControlAction.STOP]: {
        label: "Stop",
        pendingLabel: "Stopping",
        icon: CircleStopIcon,
        tone: InvestigationControlTone.DESTRUCTIVE,
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
 * What the controls act on. They stand on the sidebar's shelf rather than over the page, so the
 * group says which run they end, and not the one the operator is only reading about.
 */
export const INVESTIGATION_CONTROL_LABEL = "Run" as const;

/** The one control drawn apart, because a run the lab cannot reopen should not read as an errand. */
export const INVESTIGATION_CONTROL_TONE: Record<InvestigationControlTone, string> = {
    [InvestigationControlTone.ORDINARY]: "",
    [InvestigationControlTone.DESTRUCTIVE]:
        "text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10 active:text-destructive"
};

/** A refusal stands under the control it belongs to, and wraps rather than losing its own words. */
export const INVESTIGATION_CONTROL_FAILURE = "mt-1 px-3 text-sm text-destructive" as const;
