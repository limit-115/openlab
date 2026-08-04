import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { investigationView } from "#src/dashboard-routes/dashboard-routes.const";
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

function renderAt(path: string) {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
            new Response(JSON.stringify(statusFixture), {
                headers: { "Content-Type": "application/json" }
            })
        )
    );
    return render(
        <RouterProvider router={createMemoryRouter(dashboardRoutes, { initialEntries: [path] })} />,
        { wrapper: wrapper() }
    );
}

const investigationId = statusFixture.investigation.id;

describe("InvestigationHeader", () => {
    beforeEach(() => {
        FakeEventSource.reset();
        vi.stubGlobal("EventSource", FakeEventSource);
    });

    it("keeps every view an address, so one can be opened in a tab of its own", async () => {
        renderAt(investigationView(investigationId));

        expect(await screen.findByRole("tab", { name: "Overview" })).toHaveAttribute(
            "href",
            investigationView(investigationId)
        );
        expect(screen.getByRole("tab", { name: "Team" })).toHaveAttribute(
            "href",
            `${investigationView(investigationId)}/team`
        );
    });

    it("selects the view the address names rather than the first one listed", async () => {
        renderAt(`${investigationView(investigationId)}/team`);

        await waitFor(() =>
            expect(screen.getByRole("tab", { name: "Team" })).toHaveAttribute(
                "aria-selected",
                "true"
            )
        );
        expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
            "aria-selected",
            "false"
        );
    });
});
