import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { investigationView, LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { TooltipProvider } from "#src/design-system/tooltip";
import { FakeEventSource } from "#src/test-support/fake-event-source";
import { rosterFixture } from "#src/test-support/roster-fixture";
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

/** The roster answers the lab's list; anything under it answers one investigation's snapshot. */
function renderAt(path: string) {
    vi.stubGlobal(
        "fetch",
        vi.fn((url: string) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        url.startsWith("/api/investigations/") ? statusFixture : rosterFixture
                    ),
                    { headers: { "Content-Type": "application/json" } }
                )
            )
        )
    );
    return render(
        <RouterProvider router={createMemoryRouter(dashboardRoutes, { initialEntries: [path] })} />,
        { wrapper: wrapper() }
    );
}

const investigationId = statusFixture.investigation.id;
const goal = rosterFixture.find((entry) => entry.id === investigationId)?.goal ?? "missing";

describe("LabBreadcrumbs", () => {
    beforeEach(() => {
        FakeEventSource.reset();
        vi.stubGlobal("EventSource", FakeEventSource);
    });

    it("walks back from an open view through its investigation to the roster", async () => {
        renderAt(`${investigationView(investigationId)}/team`);

        const trail = await screen.findByRole("navigation", { name: "breadcrumb" });
        await waitFor(() => expect(within(trail).getByText(goal)).toBeInTheDocument());

        expect(within(trail).getByRole("link", { name: "Investigations" })).toHaveAttribute(
            "href",
            LabRoute.ROSTER
        );
        expect(within(trail).getByRole("link", { name: goal })).toHaveAttribute(
            "href",
            investigationView(investigationId)
        );
        expect(within(trail).queryByRole("link", { name: "Team" })).toBeNull();
    });

    it("keeps a goal too long for the bar readable in full where it is clipped", async () => {
        renderAt(investigationView(investigationId));

        const trail = await screen.findByRole("navigation", { name: "breadcrumb" });
        await waitFor(() => expect(within(trail).getByText(goal)).toBeInTheDocument());

        expect(within(trail).getByText(goal)).toHaveAttribute("title", goal);
    });

    it("offers nowhere to go from the page the operator is already on", async () => {
        renderAt(LabRoute.ROSTER);

        const trail = await screen.findByRole("navigation", { name: "breadcrumb" });

        expect(within(trail).getByText("Investigations")).toBeInTheDocument();
        expect(within(trail).queryByRole("link")).toBeNull();
    });
});
