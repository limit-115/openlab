import {
    AgentActivityPhase,
    AgentActivityPhaseByFrameKind,
    AgentRunStatus
} from "@lab/protocol/agent-activity/agent-activity.const";
import type { AgentActivity } from "@lab/protocol/agent-activity/agent-activity.types";
import { AgentActivityFrameKind } from "@lab/protocol/agent-activity/agent-activity-frame.const";
import type { AgentActivityFrame } from "@lab/protocol/agent-activity/agent-activity-frame.types";
import type {
    TranscriptEntry,
    TranscriptTurn,
    WatchedAgent
} from "#src/team/agent-transcript.types";

/**
 * Holds what the Team tab draws, and decides how often it is worth drawing.
 *
 * A model writing at speed produces a frame per token, each arriving in its own task, so React would
 * otherwise re-render the whole tab hundreds of times a second. Readers are told once per animation
 * frame instead, while the data itself is applied the moment it arrives.
 */
export class AgentActivityStore {
    readonly #agents = new Map<string, WatchedAgent>();
    readonly #listeners = new Set<() => void>();
    readonly #schedule: (notify: () => void) => void;
    #snapshot: WatchedAgent[] = [];
    #stale = false;
    #scheduled = false;

    constructor(schedule: (notify: () => void) => void = animationFrame) {
        this.#schedule = schedule;
    }

    subscribe = (listener: () => void): (() => void) => {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    };

    getSnapshot = (): WatchedAgent[] => {
        if (this.#stale) {
            this.#snapshot = [...this.#agents.values()];
            this.#stale = false;
        }
        return this.#snapshot;
    };

    /** A roster replaces what is on screen: it is the whole truth as the daemon currently has it. */
    receiveRoster(roster: readonly AgentActivity[]): void {
        this.#agents.clear();
        for (const activity of roster) {
            this.#agents.set(activity.agent_id, { activity, transcript: [] });
        }
        this.changed();
    }

    receiveFrame(frame: AgentActivityFrame): void {
        if (frame.kind === AgentActivityFrameKind.RUN_STARTED) {
            this.#agents.set(frame.agent_id, { activity: startedActivity(frame), transcript: [] });
            this.changed();
            return;
        }

        const watched = this.#agents.get(frame.agent_id);
        if (watched === undefined || watched.activity.run_id !== frame.run_id) {
            return;
        }
        this.#agents.set(frame.agent_id, {
            activity: applyToActivity(watched.activity, frame),
            transcript: applyToTranscript(watched.transcript, frame)
        });
        this.changed();
    }

    clear(): void {
        this.#agents.clear();
        this.changed();
    }

    private changed(): void {
        this.#stale = true;
        if (this.#scheduled) {
            return;
        }
        this.#scheduled = true;
        this.#schedule(() => {
            this.#scheduled = false;
            for (const listener of this.#listeners) {
                listener();
            }
        });
    }
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
        agent_id: frame.agent_id,
        run_id: frame.run_id,
        branch_id: frame.branch_id,
        task_id: frame.task_id,
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
