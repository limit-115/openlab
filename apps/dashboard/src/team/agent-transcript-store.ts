import {
    AgentActivityPhase,
    AgentActivityPhaseByFrameKind
} from "@lab/protocol/agent-activity/agent-activity.const";
import type { AgentActivity } from "@lab/protocol/agent-activity/agent-activity.types";
import { AgentActivityFrameKind } from "@lab/protocol/agent-activity/agent-activity-frame.const";
import type { AgentActivityFrame } from "@lab/protocol/agent-activity/agent-activity-frame.types";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { createStore } from "zustand/vanilla";
import { StreamState } from "#src/live-status/status-stream.const";
import type {
    TranscriptEntry,
    TranscriptTurn,
    WatchedAgent
} from "#src/team/agent-transcript.types";
import type { AgentActivityState, RedrawSchedule } from "#src/team/agent-transcript-store.types";

export type AgentActivityStore = ReturnType<typeof createAgentActivityStore>;

/**
 * Holds what the Team tab draws, and decides how often it is worth drawing.
 *
 * A model writing at speed produces a frame per token, each arriving in its own task, so React would
 * otherwise re-render the whole tab hundreds of times a second. Frames are applied to the watched
 * agents the moment they arrive, while the roster readers see is published once per animation frame.
 */
export function createAgentActivityStore(schedule: RedrawSchedule = animationFrame) {
    return createStore<AgentActivityState>()((set, get) => {
        const watched = new Map<string, WatchedAgent>();
        let scheduled = false;

        /**
         * Only the agent a frame belongs to is replaced, so every other one keeps the identity it
         * had. A card whose agent said nothing this frame compares equal and is left alone.
         */
        const publish = () => {
            if (scheduled) {
                return;
            }
            scheduled = true;
            schedule(() => {
                scheduled = false;
                set({ agents: [...watched.values()] });
            });
        };

        return {
            state: StreamState.CONNECTING,
            agents: [],

            /** The stream reports it is live on every frame, so saying it again must cost nothing. */
            setStreamState(state) {
                if (get().state !== state) {
                    set({ state });
                }
            },

            receiveRoster(roster) {
                watched.clear();
                for (const activity of roster) {
                    watched.set(activity.run_id, { activity, transcript: [] });
                }
                publish();
            },

            receiveFrame(frame) {
                if (frame.kind === AgentActivityFrameKind.RUN_STARTED) {
                    watched.set(frame.run_id, {
                        activity: startedActivity(frame),
                        transcript: []
                    });
                    publish();
                    return;
                }

                const agent = watched.get(frame.run_id);
                if (agent === undefined) {
                    return;
                }
                watched.set(frame.run_id, {
                    activity: applyToActivity(agent.activity, frame),
                    transcript: applyToTranscript(agent.transcript, frame)
                });
                publish();
            },

            clear() {
                watched.clear();
                publish();
            }
        };
    });
}

function animationFrame(notify: () => void): void {
    if (typeof requestAnimationFrame === "undefined") {
        notify();
        return;
    }
    requestAnimationFrame(notify);
}

function startedActivity(
    frame: Extract<AgentActivityFrame, { kind: typeof AgentActivityFrameKind.RUN_STARTED }>
): AgentActivity {
    return {
        run_id: frame.run_id,
        ...(frame.assumption_id === undefined ? {} : { assumption_id: frame.assumption_id }),
        role: frame.role,
        execution: frame.execution,
        artifact_directory: frame.artifact_directory,
        started_at: frame.started_at,
        session_id: frame.session_id,
        phase: AgentActivityPhase.STARTING,
        status: AgentRunStatus.RUNNING,
        usage: null,
        error: null,
        updated_at: frame.occurred_at
    };
}

/**
 * The stream carries frames rather than the phase the daemon computed from them, because a viewer
 * that joins mid-run is caught up by replaying the same frames from disk. So the phase is derived
 * here, from the contract's table, and both ends read an agent the same way.
 */
function applyToActivity(activity: AgentActivity, frame: AgentActivityFrame): AgentActivity {
    const phase = AgentActivityPhaseByFrameKind[frame.kind];
    return {
        ...activity,
        ...(phase === null ? {} : { phase }),
        ...(frame.kind === AgentActivityFrameKind.USAGE ? { usage: frame.usage } : {}),
        ...(frame.kind === AgentActivityFrameKind.RUN_FINISHED
            ? { status: frame.status, error: frame.error }
            : {}),
        updated_at: frame.occurred_at
    };
}

function applyToTranscript(
    transcript: readonly TranscriptEntry[],
    frame: AgentActivityFrame
): readonly TranscriptEntry[] {
    switch (frame.kind) {
        case AgentActivityFrameKind.THINKING:
        case AgentActivityFrameKind.MESSAGE:
            return applyTurn(transcript, frame);
        case AgentActivityFrameKind.TOOL:
            return applyToolCall(transcript, frame);
        case AgentActivityFrameKind.DIAGNOSTIC:
            return [
                ...transcript,
                {
                    id: entryId(frame),
                    kind: AgentActivityFrameKind.DIAGNOSTIC,
                    level: frame.level,
                    message: frame.message
                }
            ];
        default:
            return transcript;
    }
}

/**
 * A sealed frame carries the turn's whole text and replaces whatever the chunks built up, so a
 * viewer that joined mid-turn ends up with the same words as one that watched from the start.
 */
function applyTurn(
    transcript: readonly TranscriptEntry[],
    frame: Extract<AgentActivityFrame, { sealed: boolean }>
): readonly TranscriptEntry[] {
    const index = transcript.findIndex(
        (entry): entry is TranscriptTurn =>
            entry.kind === frame.kind && "turn" in entry && entry.turn === frame.turn
    );
    if (index < 0) {
        return [
            ...transcript,
            {
                id: entryId(frame),
                kind: frame.kind,
                turn: frame.turn,
                text: frame.text,
                sealed: frame.sealed
            }
        ];
    }

    const current = transcript[index] as TranscriptTurn;
    if (current.sealed) {
        return transcript;
    }
    const updated: TranscriptTurn = {
        ...current,
        text: frame.sealed ? frame.text : current.text + frame.text,
        sealed: frame.sealed
    };
    return transcript.map((entry, at) => (at === index ? updated : entry));
}

/** A call and its result are one thing that happened, so the result advances the call it belongs to. */
function applyToolCall(
    transcript: readonly TranscriptEntry[],
    frame: Extract<AgentActivityFrame, { kind: typeof AgentActivityFrameKind.TOOL }>
): readonly TranscriptEntry[] {
    const index =
        frame.call_id === null
            ? -1
            : transcript.findIndex(
                  (entry) =>
                      entry.kind === AgentActivityFrameKind.TOOL && entry.callId === frame.call_id
              );
    if (index < 0) {
        return [
            ...transcript,
            {
                id: entryId(frame),
                kind: AgentActivityFrameKind.TOOL,
                toolName: frame.tool_name,
                callId: frame.call_id,
                phase: frame.phase,
                detail: frame.detail
            }
        ];
    }

    return transcript.map((entry, at) =>
        at === index && entry.kind === AgentActivityFrameKind.TOOL
            ? { ...entry, phase: frame.phase, detail: entry.detail ?? frame.detail }
            : entry
    );
}

function entryId(frame: AgentActivityFrame): string {
    return `${frame.run_id}:${frame.sequence}`;
}
