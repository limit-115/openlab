import type { StreamState } from "#src/live-status/status-stream.const";
import type { WatchedAgent } from "#src/team/agent-transcript.types";

export interface LiveAgents {
    readonly state: StreamState;
    readonly agents: readonly WatchedAgent[];
}
