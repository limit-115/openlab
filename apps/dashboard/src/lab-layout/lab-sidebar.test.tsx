import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { investigationAddress, LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
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

function sidebar(): HTMLElement {
    const element = document.querySelector<HTMLElement>('[data-slot="sidebar"]');
    if (element === null) {
        throw new Error("The sidebar is not on the page.");
    }
    return element;
}

/**
 * Scoped to the sidebar, because the trail in the bar links to the same addresses by the same
 * names. The entry is the link's own menu button, which is what carries the mark.
 */
function entry(name: string): HTMLElement | null | undefined {
    return within(sidebar()).getByRole("link", { name }).closest("[data-sidebar='menu-button']");
}

const investigationId = statusFixture.investigation.id;
const goal = rosterFixture.find((item) => item.id === investigationId)?.goal ?? "missing";
const otherGoal = rosterFixture.find((item) => item.id !== investigationId)?.goal ?? "missing";

describe("LabSidebar", () => {
    beforeEach(() => {
        FakeEventSource.reset();
        vi.stubGlobal("EventSource", FakeEventSource);
    });

    it("marks the roster while the roster is what the operator is reading", async () => {
        renderAt(LabRoute.ROSTER);

        await waitFor(() => expect(entry("Investigations")).toHaveAttribute("data-active", "true"));
        expect(entry("Settings")).toHaveAttribute("data-active", "false");
    });

    it("marks settings without also marking the roster it is reached from", async () => {
        renderAt(LabRoute.SETTINGS);

        await waitFor(() => expect(entry("Settings")).toHaveAttribute("data-active", "true"));
        expect(entry("Investigations")).toHaveAttribute("data-active", "false");
    });

    it("offers the open investigation only the ways out its own state allows", async () => {
        renderAt(investigationAddress(investigationId));

        await within(sidebar()).findByRole("button", { name: "Stop" });
        expect(within(sidebar()).queryByRole("button", { name: "Wake" })).toBeNull();
    });

    it("takes the run's controls away with the investigation the operator left", async () => {
        const user = userEvent.setup();
        renderAt(investigationAddress(investigationId));
        await within(sidebar()).findByRole("button", { name: "Stop" });

        await user.click(within(sidebar()).getByRole("link", { name: "Investigations" }));

        await waitFor(() =>
            expect(within(sidebar()).queryByRole("button", { name: "Stop" })).toBeNull()
        );
    });

    it("marks the open investigation alone, and not the roster it was reached from", async () => {
        renderAt(investigationAddress(investigationId));

        await waitFor(() => expect(entry(goal)).toHaveAttribute("data-active", "true"));
        expect(entry(otherGoal)).toHaveAttribute("data-active", "false");
        expect(entry("Investigations")).toHaveAttribute("data-active", "false");
    });
});
