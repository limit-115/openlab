import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import type { InvestigationEvent } from "@openlab/protocol/investigation-events/investigation-event.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { statusQueryKey } from "#src/live-status/status-client";
import { useLiveStatus } from "#src/live-status/status-stream";
import { StreamEventType, StreamState } from "#src/live-status/status-stream.const";
import { FakeEventSource } from "#src/test-support/fake-event-source";
import { statusFixture } from "#src/test-support/status-fixture";

function StreamObserver() {
    const stream = useLiveStatus("investigation-alpha-2026");
    return <output>{stream.state}</output>;
}

function wrapper(client: QueryClient) {
    return function QueryWrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

describe("useLiveStatus", () => {
    beforeEach(() => {
        FakeEventSource.reset();
        vi.stubGlobal("EventSource", FakeEventSource);
    });

    it("tracks reconnect state and appends typed investigation events", async () => {
        const client = new QueryClient();
        client.setQueryData(statusQueryKey("investigation-alpha-2026"), statusFixture);
        render(<StreamObserver />, { wrapper: wrapper(client) });
        const source = FakeEventSource.instances[0];
        expect(source).toBeDefined();

        act(() => source?.open());
        expect(screen.getByText(StreamState.LIVE)).toBeInTheDocument();

        const event: InvestigationEvent = {
            id: "event-finding-confirmed",
            investigation_id: statusFixture.investigation.id,
            type: EventType.FINDING_CONFIRMED,
            occurred_at: "2026-08-02T10:01:00.000Z",
            payload: { summary: "The verifier confirmed the landmark claim" }
        };
        act(() => source?.emit(StreamEventType.EVENT, event));

        await waitFor(() => {
            expect(
                client.getQueryData<typeof statusFixture>(
                    statusQueryKey("investigation-alpha-2026")
                )?.recent_events[0]
            ).toEqual(event);
        });

        act(() => source?.fail());
        expect(screen.getByText(StreamState.RECONNECTING)).toBeInTheDocument();
    });
});
