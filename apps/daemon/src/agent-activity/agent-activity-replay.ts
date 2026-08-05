import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import type { HarnessEvent } from "@nightlab/harness/harness-event.types";
import { HarnessArtifactFiles } from "@nightlab/harness/harness-run-artifacts.const";
import { readFinishedRunOutcome } from "@nightlab/harness/harness-run-outcome";
import type { AgentActivity } from "@nightlab/protocol/agent-activity/agent-activity.types";
import { AgentActivityFrameKind } from "@nightlab/protocol/agent-activity/agent-activity-frame.const";
import type { AgentActivityFrame } from "@nightlab/protocol/agent-activity/agent-activity-frame.types";
import { ActivityRunStatus } from "#src/agent-activity/agent-activity.const";
import { HarnessEventTranslator } from "#src/agent-activity/harness-event-translation";
import type { AgentTextFrameKind } from "#src/agent-activity/harness-event-translation.types";

interface OpenTurn {
    readonly turn: number;
    readonly text: string;
    readonly sequence: number;
    readonly occurred_at: string;
}

/**
 * Replays what an agent has done, and how it ended, from the run's own artifacts.
 *
 * The harness writes each event before it yields it, so events.jsonl already holds everything the
 * live stream has broadcast bar the last frame, which the manifest keeps instead. Replaying them is
 * what lets a viewer that joins an hour into a run see the whole run rather than the tail, without
 * the daemon buffering any of it.
 *
 * Chunks of a completed turn are folded away, because the sealed frame that closed the turn carries
 * its full text. Only the turn still being written survives as chunks, and it is emitted as one
 * unsealed frame so the live chunks that follow simply continue it.
 */
export async function* replayAgentActivity(
    activity: AgentActivity
): AsyncGenerator<AgentActivityFrame> {
    const eventsPath = resolve(activity.artifact_directory, HarnessArtifactFiles.EVENTS);
    const handle = await openEvents(eventsPath);
    if (handle === undefined) {
        return;
    }

    const translator = new HarnessEventTranslator(activity);
    const openTurns = new Map<AgentTextFrameKind, OpenTurn>();
    let lastSequence = 0;
    try {
        const lines = createInterface({
            input: handle.createReadStream(),
            crlfDelay: Number.POSITIVE_INFINITY
        });
        for await (const line of lines) {
            const event = readEvent(line);
            if (event === undefined) {
                continue;
            }
            lastSequence = Math.max(lastSequence, event.sequence);
            const frame = translator.translate(event);
            if (frame === undefined) {
                continue;
            }
            if (!isTextFrame(frame)) {
                yield frame;
                continue;
            }
            if (frame.sealed) {
                openTurns.delete(frame.kind);
                yield frame;
                continue;
            }
            openTurns.set(frame.kind, accumulate(openTurns.get(frame.kind), frame));
        }
    } finally {
        await handle.close();
    }

    for (const [kind, turn] of openTurns) {
        yield {
            run_id: activity.run_id,
            sequence: turn.sequence,
            occurred_at: turn.occurred_at,
            kind,
            turn: turn.turn,
            text: turn.text,
            sealed: false
        };
    }

    /**
     * The event that ends a run is the one event the run cannot write into its own events.jsonl,
     * because it carries the manifest and the manifest carries that file's hash. Replaying the file
     * alone would therefore leave every finished agent looking like it is still working, so the
     * outcome is read from the manifest and told as the frame the live stream sent at the time.
     */
    const outcome = await readFinishedRunOutcome(activity.artifact_directory);
    if (outcome !== undefined) {
        yield {
            run_id: activity.run_id,
            sequence: lastSequence + 1,
            occurred_at: outcome.finishedAt,
            kind: AgentActivityFrameKind.RUN_FINISHED,
            status: ActivityRunStatus[outcome.status],
            error: outcome.error
        };
    }
}

function accumulate(
    current: OpenTurn | undefined,
    frame: Extract<AgentActivityFrame, { sealed: boolean }>
): OpenTurn {
    const text = current?.turn === frame.turn ? current.text + frame.text : frame.text;
    return {
        turn: frame.turn,
        text,
        sequence: frame.sequence,
        occurred_at: frame.occurred_at
    };
}

function isTextFrame(
    frame: AgentActivityFrame
): frame is Extract<AgentActivityFrame, { sealed: boolean }> {
    return (
        frame.kind === AgentActivityFrameKind.THINKING ||
        frame.kind === AgentActivityFrameKind.MESSAGE
    );
}

async function openEvents(path: string) {
    try {
        return await open(path, "r");
    } catch (error) {
        /** A run that has only just started has not opened its event file yet. */
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            return undefined;
        }
        throw error;
    }
}

/** The tail of a file being appended to can be a half-written line, which is simply not there yet. */
function readEvent(line: string): HarnessEvent | undefined {
    if (!line.trim()) {
        return undefined;
    }
    try {
        const candidate: unknown = JSON.parse(line);
        return isEvent(candidate) ? candidate : undefined;
    } catch {
        return undefined;
    }
}

function isEvent(candidate: unknown): candidate is HarnessEvent {
    if (typeof candidate !== "object" || candidate === null) {
        return false;
    }
    const record = candidate as Record<string, unknown>;
    return typeof record.type === "string" && typeof record.sequence === "number";
}
