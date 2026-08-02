import type { AgentActivityFrameKind } from "@lab/protocol/agent-activity/agent-activity-frame.const";

/** The frame kinds that carry a turn of text and therefore need turn numbering. */
export type AgentTextFrameKind =
    | typeof AgentActivityFrameKind.THINKING
    | typeof AgentActivityFrameKind.MESSAGE;
