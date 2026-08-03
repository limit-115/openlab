import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { SubscriptionAllowanceState } from "@lab/protocol/subscription-allowance/subscription-allowance.const";
import type { SubscriptionAllowanceRoster } from "@lab/protocol/subscription-allowance/subscription-allowance.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SubscriptionsView } from "#src/dashboard-routes/subscriptions-view";
import {
    READ_AT_LABEL,
    REFRESH_LABEL
} from "#src/subscription-allowance/allowance-reading-header.const";
import { NO_ALLOWANCE_TITLE } from "#src/subscription-allowance/subscription-allowance-panel.const";
import { formatDate } from "#src/value-display/timestamp-display";

const HELD_READING = "2026-08-03T12:00:00.000Z";
const FRESH_READING = "2026-08-03T12:41:00.000Z";

function roster(readAt: string, usedPercent: number): SubscriptionAllowanceRoster {
    return [
        {
            harness: AgentHarnessKind.GLM,
            state: SubscriptionAllowanceState.AVAILABLE,
            plan: "pro",
            windows: [{ duration_minutes: 300, used_percent: usedPercent, resets_at: null }],
            error: null,
            read_at: readAt
        }
    ];
}

const ROSTER = roster(HELD_READING, 97);

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

/** The daemon serves what it holds until it is asked for a fresh reading, exactly as it does live. */
function respondByReading(held: unknown, fresh: unknown) {
    const request = vi.fn((url: string) =>
        Promise.resolve(
            new Response(JSON.stringify(url.includes("fresh=1") ? fresh : held), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        )
    );
    vi.stubGlobal("fetch", request);
    return request;
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

    it("dates the numbers by the moment the vendors were read", async () => {
        respondWith(ROSTER);
        renderView();

        expect(
            await screen.findByText(`${READ_AT_LABEL} ${formatDate(HELD_READING)}`)
        ).toBeInTheDocument();
    });

    it("asks the vendors again on refresh rather than for the reading already on the page", async () => {
        const request = respondByReading(ROSTER, roster(FRESH_READING, 12));
        renderView();
        await screen.findByLabelText("5 hours window");

        await userEvent.click(screen.getByRole("button", { name: REFRESH_LABEL }));

        expect(
            await screen.findByText(`${READ_AT_LABEL} ${formatDate(FRESH_READING)}`)
        ).toBeInTheDocument();
        expect(request.mock.calls.at(-1)?.[0]).toContain("fresh=1");
        expect(screen.getByLabelText<HTMLProgressElement>("5 hours window").value).toBe(12);
    });

    it("says the vendors could not be asked again rather than redating the standing numbers", async () => {
        respondWith(ROSTER);
        renderView();
        await screen.findByLabelText("5 hours window");
        respondWith({ error: "Codex is rate-limiting the usage endpoint" }, 503);

        await userEvent.click(screen.getByRole("button", { name: REFRESH_LABEL }));

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(
            screen.getByText(`${READ_AT_LABEL} ${formatDate(HELD_READING)}`)
        ).toBeInTheDocument();
    });

    it("says why there are no numbers when the runtime does not serve the readings", async () => {
        respondWith({ error: "Not found" }, 404);
        renderView();

        expect(await screen.findByText(NO_ALLOWANCE_TITLE)).toBeInTheDocument();
        expect(screen.queryByLabelText("5 hours window")).not.toBeInTheDocument();
    });
});
