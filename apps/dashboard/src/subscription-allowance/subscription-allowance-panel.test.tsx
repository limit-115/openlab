import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { SubscriptionAllowanceState } from "@lab/protocol/subscription-allowance/subscription-allowance.const";
import type { SubscriptionAllowanceRoster } from "@lab/protocol/subscription-allowance/subscription-allowance.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SubscriptionAllowancePanel } from "#src/subscription-allowance/subscription-allowance-panel";

const ROSTER: SubscriptionAllowanceRoster = [
    {
        harness: AgentHarnessKind.CLAUDE,
        state: SubscriptionAllowanceState.AVAILABLE,
        plan: "max",
        windows: [
            {
                duration_minutes: 300,
                used_percent: 41,
                resets_at: "2026-08-03T17:40:00.000Z"
            },
            {
                duration_minutes: 10_080,
                used_percent: 28,
                resets_at: "2026-08-08T07:00:00.000Z"
            }
        ],
        error: null,
        read_at: "2026-08-03T12:00:00.000Z"
    },
    {
        harness: AgentHarnessKind.CODEX,
        state: SubscriptionAllowanceState.EXHAUSTED,
        plan: "plus",
        windows: [
            {
                duration_minutes: 10_080,
                used_percent: 100,
                resets_at: "2026-08-09T13:50:53.000Z"
            }
        ],
        error: null,
        read_at: "2026-08-03T12:00:00.000Z"
    },
    {
        harness: AgentHarnessKind.GLM,
        state: SubscriptionAllowanceState.UNREADABLE,
        plan: null,
        windows: [],
        error: "No ZCode login store at /Users/operator/.zcode/v2/config.json",
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

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<SubscriptionAllowancePanel />, {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        )
    });
}

describe("SubscriptionAllowancePanel", () => {
    it("meters each window against what the vendor said is spent", async () => {
        respondWith(ROSTER);
        renderPanel();

        const session = await screen.findByLabelText<HTMLProgressElement>("5 hours window");
        const week = screen.getAllByLabelText<HTMLProgressElement>("7 days window");

        expect(session.value).toBe(41);
        expect(week.map((meter) => meter.value)).toEqual([28, 100]);
    });

    it("marks the subscription the lab will pass over", async () => {
        respondWith(ROSTER);
        renderPanel();

        expect(await screen.findByText("No allowance left")).toBeInTheDocument();
        expect(screen.getByText("plus")).toBeInTheDocument();
    });

    it("gives the vendor's reason in full when a subscription could not be read", async () => {
        respondWith(ROSTER);
        renderPanel();

        expect(
            await screen.findByText("No ZCode login store at /Users/operator/.zcode/v2/config.json")
        ).toBeInTheDocument();
        expect(screen.queryByLabelText("30 days window")).not.toBeInTheDocument();
    });

    it("draws nothing at all while the runtime does not serve the readings", async () => {
        respondWith({ error: "Not found" }, 404);
        const { container } = renderPanel();

        await expect
            .poll(() => (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length)
            .toBeGreaterThan(0);
        expect(container).toBeEmptyDOMElement();
    });
});
