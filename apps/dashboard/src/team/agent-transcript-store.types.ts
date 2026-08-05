import type { AgentActivity } from "@nightlab/protocol/agent-activity/agent-activity.types";
import type { AgentActivityFrame } from "@nightlab/protocol/agent-activity/agent-activity-frame.types";
import type { StreamState } from "#src/live-status/status-stream.const";
import type { LiveAgents } from "#src/team/team-stream.types";

/** Hands a redraw to whoever decides when the next one is worth doing, normally the browser. */
export type RedrawSchedule = (notify: () => void) => void;

/** What the Team tab reads, and the only ways watching the stream may change it. */
export interface AgentActivityState extends LiveAgents {
    setStreamState(state: StreamState): void;
    /** A roster replaces what is on screen: it is the whole truth as the daemon currently has it. */
    receiveRoster(roster: readonly AgentActivity[]): void;
    receiveFrame(frame: AgentActivityFrame): void;
    clear(): void;
}
