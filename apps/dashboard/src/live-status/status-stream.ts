import { InvestigationEventSchema } from "@lab/protocol/investigation-events/investigation-event.schema";
import type { InvestigationEvent } from "@lab/protocol/investigation-events/investigation-event.types";
import { StatusSnapshotSchema } from "@lab/protocol/investigation-status/status-snapshot.schema";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { statusQueryKey } from "#src/live-status/status-client";
import { StreamEventType, StreamState } from "#src/live-status/status-stream.const";
import type { LiveStatus } from "#src/live-status/status-stream.types";

function readPayload(event: MessageEvent<string>): unknown {
    return JSON.parse(event.data);
}

function prependEvent(snapshot: StatusSnapshot, event: InvestigationEvent): StatusSnapshot {
    const withoutDuplicate = snapshot.recent_events.filter(
        (candidate) => candidate.id !== event.id
    );

    return {
        ...snapshot,
        recent_events: [event, ...withoutDuplicate].slice(0, 50)
    };
}

export function useLiveStatus(enabled = true): LiveStatus {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<LiveStatus>({ state: StreamState.CONNECTING });

    useEffect(() => {
        if (!enabled || typeof EventSource === "undefined") {
            setStatus({ state: StreamState.UNAVAILABLE });
            return;
        }

        const source = new EventSource("/api/events");

        const markProtocolError = (error: unknown) => {
            const message = error instanceof Error ? error.message : "Invalid live update";
            setStatus((current) => ({ ...current, protocolError: message }));
        };

        const receiveSnapshot = (event: Event) => {
            try {
                const snapshot = StatusSnapshotSchema.parse(
                    readPayload(event as MessageEvent<string>)
                );
                queryClient.setQueryData(statusQueryKey, snapshot);
                setStatus({ state: StreamState.LIVE });
            } catch (error) {
                markProtocolError(error);
            }
        };

        const receiveInvestigationEvent = (event: Event) => {
            try {
                const labEvent = InvestigationEventSchema.parse(
                    readPayload(event as MessageEvent<string>)
                );
                queryClient.setQueryData<StatusSnapshot>(statusQueryKey, (snapshot) =>
                    snapshot ? prependEvent(snapshot, labEvent) : snapshot
                );
                setStatus({ state: StreamState.LIVE });
                void queryClient.invalidateQueries({ queryKey: statusQueryKey });
            } catch (error) {
                markProtocolError(error);
            }
        };

        source.onopen = () => {
            setStatus((current) => ({ ...current, state: StreamState.LIVE }));
        };
        source.onerror = () => {
            setStatus((current) => ({
                ...current,
                state:
                    source.readyState === EventSource.CLOSED
                        ? StreamState.UNAVAILABLE
                        : StreamState.RECONNECTING
            }));
        };
        source.onmessage = receiveInvestigationEvent;
        source.addEventListener(StreamEventType.EVENT, receiveInvestigationEvent);
        source.addEventListener(StreamEventType.SNAPSHOT, receiveSnapshot);
        source.addEventListener(StreamEventType.STATUS, receiveSnapshot);

        return () => {
            source.close();
        };
    }, [enabled, queryClient]);

    return status;
}
