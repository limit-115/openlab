import { AgentActivityPhase } from "@lab/protocol/agent-activity/agent-activity.const";
import { AgentActivityFrameKind } from "@lab/protocol/agent-activity/agent-activity-frame.const";
import type { AgentLatestLine } from "#src/team/agent-latest-line.types";
import type { TranscriptEntry, WatchedAgent } from "#src/team/agent-transcript.types";
import { PHASE_LABEL } from "#src/team/team-panel.const";

/**
 * The one line that says what an agent is doing, for the roster where every agent is listed at
 * once. A tool call names itself and what it was called on; anything else falls back to the phase,
 * because the words of a turn belong in the transcript rather than in a list entry.
 */
export function agentLatestLine({ activity, transcript }: WatchedAgent): AgentLatestLine {
    const call = lastToolCall(transcript);

    if (activity.phase === AgentActivityPhase.USING_TOOL && call !== undefined) {
        return { verb: call.toolName, detail: call.detail };
    }

    return { verb: PHASE_LABEL[activity.phase], detail: null };
}

function lastToolCall(transcript: readonly TranscriptEntry[]) {
    for (let index = transcript.length - 1; index >= 0; index -= 1) {
        const entry = transcript[index];
        if (entry?.kind === AgentActivityFrameKind.TOOL) {
            return entry;
        }
    }
    return undefined;
}
