import { type LabEvent, LabEventSchema } from "@lab/protocol/schemas";
import { type StatusSnapshot, StatusSnapshotSchema } from "@lab/protocol/status";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { statusQueryKey } from "#src/api/status-client";

export type StreamState = "connecting" | "live" | "reconnecting" | "unavailable";

export interface LiveStatus {
    state: StreamState;
    lastEventAt?: Date;
    protocolError?: string;
}

function readPayload(event: MessageEvent<string>): unknown {
    return JSON.parse(event.data);
}

function prependEvent(snapshot: StatusSnapshot, event: LabEvent): StatusSnapshot {
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
    const [status, setStatus] = useState<LiveStatus>({ state: "connecting" });

    useEffect(() => {
        if (!enabled || typeof EventSource === "undefined") {
            setStatus({ state: "unavailable" });
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
                setStatus({ state: "live", lastEventAt: new Date() });
            } catch (error) {
                markProtocolError(error);
            }
        };

        const receiveLabEvent = (event: Event) => {
            try {
                const labEvent = LabEventSchema.parse(readPayload(event as MessageEvent<string>));
                queryClient.setQueryData<StatusSnapshot>(statusQueryKey, (snapshot) =>
                    snapshot ? prependEvent(snapshot, labEvent) : snapshot
                );
                setStatus({ state: "live", lastEventAt: new Date() });
                void queryClient.invalidateQueries({ queryKey: statusQueryKey });
            } catch (error) {
                markProtocolError(error);
            }
        };

        source.onopen = () => {
            setStatus((current) => ({ ...current, state: "live" }));
        };
        source.onerror = () => {
            setStatus((current) => ({
                ...current,
                state: source.readyState === EventSource.CLOSED ? "unavailable" : "reconnecting"
            }));
        };
        source.onmessage = receiveLabEvent;
        source.addEventListener("event", receiveLabEvent);
        source.addEventListener("snapshot", receiveSnapshot);
        source.addEventListener("status", receiveSnapshot);

        return () => {
            source.close();
        };
    }, [enabled, queryClient]);

    return status;
}
