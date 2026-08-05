import type { HarnessEvent } from "@nightlab/harness/harness-event.types";
import type { AgentActivity } from "@nightlab/protocol/agent-activity/agent-activity.types";
import type { AgentActivityFrame } from "@nightlab/protocol/agent-activity/agent-activity-frame.types";

export type AgentActivityListener = (frame: AgentActivityFrame, activity: AgentActivity) => void;

/** One agent's live run, held by whoever is consuming the harness stream for it. */
export interface AgentActivityRun {
    publish(event: HarnessEvent): void;
    /** Closes a run whose harness stream ended without reporting how it went. */
    abandon(error: string): void;
}
