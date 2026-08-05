import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { TooltipProvider } from "#src/design-system/tooltip";
import { INVESTIGATION_ROSTER_EN } from "#src/investigation-roster/investigation-roster.i18n";
import { FakeEventSource } from "#src/test-support/fake-event-source";
import { ThemeProvider } from "#src/theme/theme-provider";
import { WELCOME_EN } from "#src/welcome/welcome.i18n";
import { rememberIntroduction } from "#src/welcome/welcome-introduction";

beforeEach(() => {
    vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 })))
    );
    vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
    localStorage.clear();
});

function openLab() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createMemoryRouter(dashboardRoutes, { initialEntries: [LabRoute.ROSTER] });

    function Providers({ children }: { children: ReactNode }) {
        return (
            <ThemeProvider>
                <QueryClientProvider client={client}>
                    <TooltipProvider>{children}</TooltipProvider>
                </QueryClientProvider>
            </ThemeProvider>
        );
    }

    return render(<RouterProvider router={router} />, { wrapper: Providers });
}

describe("IntroducedRoster", () => {
    it("greets an operator the lab has never been shown to", async () => {
        openLab();

        expect(await screen.findByText(WELCOME_EN.title)).toBeInTheDocument();
    });

    it("opens on the investigations for an operator who has already been shown it", async () => {
        rememberIntroduction();

        openLab();

        expect(await screen.findByText(INVESTIGATION_ROSTER_EN.emptyTitle)).toBeInTheDocument();
        expect(screen.queryByText(WELCOME_EN.title)).not.toBeInTheDocument();
    });
});
