import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { SubscriptionAllowanceState } from "@lab/protocol/subscription-allowance/subscription-allowance.const";
import type { SubscriptionAllowanceRoster } from "@lab/protocol/subscription-allowance/subscription-allowance.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SubscriptionsView } from "#src/dashboard-routes/subscriptions-view";
import { NO_ALLOWANCE_TITLE } from "#src/subscription-allowance/subscription-allowance-panel.const";

const ROSTER: SubscriptionAllowanceRoster = [
    {
        harness: AgentHarnessKind.GLM,
        state: SubscriptionAllowanceState.AVAILABLE,
        plan: "pro",
        windows: [
            { duration_minutes: 300, used_percent: 97, resets_at: "2026-08-03T18:34:19.358Z" }
        ],
        error: null,
        read_at: "2026-08-03T12:00:00.000Z"
    }
];

function respondWith(payload: unknown, status = 200) {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
            new Response(JSON.stringify(payload), {
                status,
                headers: { "Content-Type": "application/json" }
            })
        )
    );
}

function renderView() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<SubscriptionsView />, {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        )
    });
}

describe("SubscriptionsView", () => {
    it("reads the allowance off the runtime and meters it", async () => {
        respondWith(ROSTER);
        renderView();

        const session = await screen.findByLabelText<HTMLProgressElement>("5 hours window");

        expect(session.value).toBe(97);
        expect(screen.getByText("pro")).toBeInTheDocument();
    });

    it("says why there are no numbers when the runtime does not serve the readings", async () => {
        respondWith({ error: "Not found" }, 404);
        renderView();

        expect(await screen.findByText(NO_ALLOWANCE_TITLE)).toBeInTheDocument();
        expect(screen.queryByLabelText("5 hours window")).not.toBeInTheDocument();
    });
});
