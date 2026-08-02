import { AgentActivityStreamEvent } from "@lab/protocol/agent-activity/agent-activity.const";
import { AgentActivityRosterSchema } from "@lab/protocol/agent-activity/agent-activity.schema";
import { AgentActivityFrameSchema } from "@lab/protocol/agent-activity/agent-activity-frame.schema";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { StreamState } from "#src/live-status/status-stream.const";
import { AgentActivityStore } from "#src/team/agent-transcript-store";
import { AGENT_ACTIVITY_STREAM_URL } from "#src/team/team-stream.const";
import type { LiveAgents } from "#src/team/team-stream.types";

/**
 * Watches every agent for as long as the Team tab is open.
 *
 * The stream is opened on mount and closed on unmount, so a lab nobody is watching pays nothing for
 * the frames it would otherwise have to send.
 */
export function useAgentActivity(enabled = true): LiveAgents {
    const store = useMemo(() => new AgentActivityStore(), []);
    const [state, setState] = useState<StreamState>(StreamState.CONNECTING);
    const agents = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

    useEffect(() => {
        if (!enabled || typeof EventSource === "undefined") {
            setState(StreamState.UNAVAILABLE);
            return;
        }

        const source = new EventSource(AGENT_ACTIVITY_STREAM_URL);
        const read = (event: Event) => JSON.parse((event as MessageEvent<string>).data);

        source.addEventListener(AgentActivityStreamEvent.ROSTER, (event) => {
            store.receiveRoster(AgentActivityRosterSchema.parse(read(event)));
            setState(StreamState.LIVE);
        });
        source.addEventListener(AgentActivityStreamEvent.ACTIVITY, (event) => {
            store.receiveFrame(AgentActivityFrameSchema.parse(read(event)));
            setState(StreamState.LIVE);
        });
        source.onopen = () => setState(StreamState.LIVE);
        /**
         * A reconnect replays the whole history again, so the roster it opens with is allowed to
         * replace everything on screen rather than being merged into what is already there.
         */
        source.onerror = () => {
            setState(
                source.readyState === EventSource.CLOSED
                    ? StreamState.UNAVAILABLE
                    : StreamState.RECONNECTING
            );
        };

        return () => {
            source.close();
            store.clear();
        };
    }, [enabled, store]);

    return { state, agents };
}
