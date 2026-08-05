import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { TooltipProvider } from "#src/design-system/tooltip";
import { INVESTIGATION_ROSTER_EN } from "#src/investigation-roster/investigation-roster.i18n";
import { FakeEventSource } from "#src/test-support/fake-event-source";
import { rosterFixture } from "#src/test-support/roster-fixture";
import { ThemeProvider } from "#src/theme/theme-provider";
import { rememberIntroduction } from "#src/welcome/welcome-introduction";

/** These pages belong to an operator who has already been shown what the lab is. */
beforeEach(rememberIntroduction);

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

function renderLab(roster: unknown) {
    vi.stubGlobal(
        "fetch",
        vi.fn(() =>
            Promise.resolve(
                new Response(JSON.stringify(roster), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                })
            )
        )
    );
    return render(<RouterProvider router={createMemoryRouter(dashboardRoutes)} />, {
        wrapper: wrapper()
    });
}

describe("RecentInvestigations", () => {
    beforeEach(() => {
        FakeEventSource.reset();
        vi.stubGlobal("EventSource", FakeEventSource);
    });

    it("opens each investigation it lists at that investigation's own address", async () => {
        renderLab(rosterFixture);

        const recents = await screen.findByRole("list", { name: INVESTIGATION_ROSTER_EN.recents });

        expect(
            within(recents).getByRole("link", { name: rosterFixture[0]?.goal ?? "missing" })
        ).toHaveAttribute("href", "/investigations/investigation-alpha-2026");
        expect(
            within(recents).getByRole("link", { name: rosterFixture[1]?.goal ?? "missing" })
        ).toHaveAttribute("href", "/investigations/investigation-beta-2026");
    });

    it("puts the investigation the lab moved last at the top, whatever order it arrives in", async () => {
        renderLab([...rosterFixture].reverse());

        const recents = await screen.findByRole("list", { name: INVESTIGATION_ROSTER_EN.recents });
        const listed = within(recents)
            .getAllByRole("link")
            .map((link) => link.getAttribute("href"));

        expect(listed).toEqual([
            "/investigations/investigation-alpha-2026",
            "/investigations/investigation-beta-2026"
        ]);
    });

    it("says nothing at all while the lab holds no investigations", async () => {
        renderLab([]);

        await screen.findByRole("button", { name: INVESTIGATION_ROSTER_EN.newInvestigation });
        expect(screen.queryByRole("list", { name: INVESTIGATION_ROSTER_EN.recents })).toBeNull();
    });
});
