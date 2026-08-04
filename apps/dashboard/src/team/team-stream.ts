import { AgentActivityStreamEvent } from "@lab/protocol/agent-activity/agent-activity.const";
import { AgentActivityRosterSchema } from "@lab/protocol/agent-activity/agent-activity.schema";
import { AgentActivityFrameSchema } from "@lab/protocol/agent-activity/agent-activity-frame.schema";
import { useEffect, useMemo } from "react";
import { useStore } from "zustand/react";
import { useShallow } from "zustand/react/shallow";
import { StreamState } from "#src/live-status/status-stream.const";
import { createAgentActivityStore } from "#src/team/agent-transcript-store";
import type { AgentActivityState } from "#src/team/agent-transcript-store.types";
import { agentActivityStreamUrl } from "#src/team/team-stream.const";
import type { LiveAgents } from "#src/team/team-stream.types";

function selectLiveAgents({ state, agents }: AgentActivityState): LiveAgents {
    return { state, agents };
}

/**
 * Watches every agent for as long as the Team tab is open.
 *
 * The stream is opened on mount and closed on unmount, so an investigation nobody is watching pays nothing for
 * the frames it would otherwise have to send.
 */
export function useAgentActivity(investigationId: string, enabled = true): LiveAgents {
    const store = useMemo(() => createAgentActivityStore(), []);
    /** The selector builds its result, so it is compared field by field rather than by identity. */
    const live = useStore(store, useShallow(selectLiveAgents));

    useEffect(() => {
        const { setStreamState, receiveRoster, receiveFrame, clear } = store.getState();

        if (!enabled || typeof EventSource === "undefined") {
            setStreamState(StreamState.UNAVAILABLE);
            return;
        }

        const source = new EventSource(agentActivityStreamUrl(investigationId));
        const read = (event: Event) => JSON.parse((event as MessageEvent<string>).data);

        source.addEventListener(AgentActivityStreamEvent.ROSTER, (event) => {
            receiveRoster(AgentActivityRosterSchema.parse(read(event)));
            setStreamState(StreamState.LIVE);
        });
        source.addEventListener(AgentActivityStreamEvent.ACTIVITY, (event) => {
            receiveFrame(AgentActivityFrameSchema.parse(read(event)));
            setStreamState(StreamState.LIVE);
        });
        source.onopen = () => setStreamState(StreamState.LIVE);
        /**
         * A reconnect replays the whole history again, so the roster it opens with is allowed to
         * replace everything on screen rather than being merged into what is already there.
         */
        source.onerror = () => {
            setStreamState(
                source.readyState === EventSource.CLOSED
                    ? StreamState.UNAVAILABLE
                    : StreamState.RECONNECTING
            );
        };

        return () => {
            source.close();
            clear();
        };
    }, [enabled, investigationId, store]);

    return live;
}
