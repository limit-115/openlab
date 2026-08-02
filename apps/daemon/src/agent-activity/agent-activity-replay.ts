import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import type { HarnessEvent } from "@lab/harness/harness-event.types";
import { HarnessArtifactFiles } from "@lab/harness/harness-run-artifacts.const";
import type { AgentActivity } from "@lab/protocol/agent-activity/agent-activity.types";
import { AgentActivityFrameKind } from "@lab/protocol/agent-activity/agent-activity-frame.const";
import type { AgentActivityFrame } from "@lab/protocol/agent-activity/agent-activity-frame.types";
import { HarnessEventTranslator } from "#src/agent-activity/harness-event-translation";
import type { AgentTextFrameKind } from "#src/agent-activity/harness-event-translation.types";

interface OpenTurn {
    readonly turn: number;
    readonly text: string;
    readonly sequence: number;
    readonly occurred_at: string;
}

/**
 * Replays what an agent has done so far from the run's own events.jsonl.
 *
 * The harness writes each event before it yields it, so this file already holds everything the live
 * stream has broadcast. Replaying it is what lets a viewer that joins an hour into a run see the
 * whole run rather than the tail, without the daemon buffering any of it.
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
            agent_id: activity.agent_id,
            run_id: activity.run_id,
            sequence: turn.sequence,
            occurred_at: turn.occurred_at,
            kind,
            turn: turn.turn,
            text: turn.text,
            sealed: false
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
