import { InvestigationSummarySchema } from "@lab/protocol/investigation-status/investigation-summary.schema";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
    ROSTER_STREAM_URL,
    RosterStreamEvent
} from "#src/investigation-roster/investigation-roster.const";
import { investigationRosterQueryKey } from "#src/investigation-roster/investigation-roster-client";
import { StreamState } from "#src/live-status/status-stream.const";
import type { LiveStatus } from "#src/live-status/status-stream.types";

/**
 * Keeps the roster live. The lab sends the whole list whenever any investigation moves, so the page
 * never has to reconcile a partial update against what it is already showing.
 */
export function useLiveRoster(enabled = true): LiveStatus {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<LiveStatus>({ state: StreamState.CONNECTING });

    useEffect(() => {
        if (!enabled || typeof EventSource === "undefined") {
            setStatus({ state: StreamState.UNAVAILABLE });
            return;
        }

        const source = new EventSource(ROSTER_STREAM_URL);

        source.addEventListener(RosterStreamEvent.ROSTER, (event) => {
            try {
                const roster = InvestigationSummarySchema.array().parse(
                    JSON.parse((event as MessageEvent<string>).data)
                );
                queryClient.setQueryData(investigationRosterQueryKey, roster);
                setStatus({ state: StreamState.LIVE });
            } catch (error) {
                setStatus((current) => ({
                    ...current,
                    protocolError: error instanceof Error ? error.message : "Invalid roster update"
                }));
            }
        });
        source.onopen = () => setStatus((current) => ({ ...current, state: StreamState.LIVE }));
        source.onerror = () => {
            setStatus((current) => ({
                ...current,
                state:
                    source.readyState === EventSource.CLOSED
                        ? StreamState.UNAVAILABLE
                        : StreamState.RECONNECTING
            }));
        };

        return () => {
            source.close();
        };
    }, [enabled, queryClient]);

    return status;
}
