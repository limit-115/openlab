import type { LabEvent } from "@lab/protocol/schemas";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { statusQueryKey } from "#src/api/status-client";
import { useLiveStatus } from "#src/api/use-live-status";
import { FakeEventSource } from "#src/test/fake-event-source";
import { statusFixture } from "#src/test/status-fixture";

function StreamObserver() {
    const stream = useLiveStatus();
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

    it("tracks reconnect state and appends typed lab events", async () => {
        const client = new QueryClient();
        client.setQueryData(statusQueryKey, statusFixture);
        render(<StreamObserver />, { wrapper: wrapper(client) });
        const source = FakeEventSource.instances[0];
        expect(source).toBeDefined();

        act(() => source?.open());
        expect(screen.getByText("live")).toBeInTheDocument();

        const event: LabEvent = {
            id: "event-claim-supported",
            lab_id: statusFixture.lab.id,
            type: "claim.supported",
            occurred_at: "2026-08-02T10:01:00.000Z",
            payload: { summary: "Candidate claim passed its evaluator" }
        };
        act(() => source?.emit("event", event));

        await waitFor(() => {
            expect(
                client.getQueryData<typeof statusFixture>(statusQueryKey)?.recent_events[0]
            ).toEqual(event);
        });

        act(() => source?.fail());
        expect(screen.getByText("reconnecting")).toBeInTheDocument();
    });
});
