import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { investigationAddress } from "#src/dashboard-routes/dashboard-routes.const";
import { TooltipProvider } from "#src/design-system/tooltip";
import { FakeEventSource } from "#src/test-support/fake-event-source";
import { statusFixture } from "#src/test-support/status-fixture";
import { ThemeProvider } from "#src/theme/theme-provider";

function wrapper() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return function QueryWrapper({ children }: { children: ReactNode }) {
        return (
            <ThemeProvider>
                <QueryClientProvider client={client}>
                    <TooltipProvider>{children}</TooltipProvider>
                </QueryClientProvider>
            </ThemeProvider>
        );
    };
}

const address = investigationAddress(statusFixture.investigation.id);

function renderInvestigation() {
    vi.stubGlobal(
        "fetch",
        /**
         * A fresh answer per call, because a Response body is read once: one shared between every
         * request means whichever of the page's queries asks second gets an exhausted body.
         */
        vi.fn(
            async () =>
                new Response(JSON.stringify(statusFixture), {
                    headers: { "Content-Type": "application/json" }
                })
        )
    );
    const router = createMemoryRouter(dashboardRoutes, { initialEntries: [address] });
    render(<RouterProvider router={router} />, { wrapper: wrapper() });
    return router;
}

describe("InvestigationHeader", () => {
    beforeEach(() => {
        FakeEventSource.reset();
        vi.stubGlobal("EventSource", FakeEventSource);
    });

    it("opens on the overview and leaves the team unasked for until it is picked", async () => {
        renderInvestigation();

        expect(
            await screen.findByRole("heading", { name: statusFixture.investigation.goal })
        ).toBeInTheDocument();
        expect(screen.queryByText("No agent is running")).toBeNull();
        expect(FakeEventSource.instances.some((source) => source.url.includes("agents"))).toBe(
            false
        );
    });

    it("swaps the panel for the view that was picked without leaving the investigation", async () => {
        const user = userEvent.setup();
        const router = renderInvestigation();

        await user.click(await screen.findByRole("tab", { name: "Team" }));

        await waitFor(() => expect(screen.getByText("No agent is running")).toBeInTheDocument());
        expect(
            screen.queryByRole("heading", { name: statusFixture.investigation.goal })
        ).toBeNull();
        expect(FakeEventSource.instances.some((source) => source.url.includes("agents"))).toBe(
            true
        );
        expect(router.state.location.pathname).toBe(address);
    });
});
