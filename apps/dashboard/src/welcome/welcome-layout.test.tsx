import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { TooltipProvider } from "#src/design-system/tooltip";
import { HARNESS_SETUP_EN } from "#src/harness-setup/harness-setup.i18n";
import { FakeEventSource } from "#src/test-support/fake-event-source";
import { ThemeProvider } from "#src/theme/theme-provider";
import { WELCOME_EN } from "#src/welcome/welcome.i18n";
import { WELCOME_STEPS, WelcomeStep } from "#src/welcome/welcome-steps.const";

beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 })))
    );
    vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function openWizard(at: string = WelcomeStep.LAB) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createMemoryRouter(dashboardRoutes, { initialEntries: [at] });

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

function progress(step: number): string {
    return WELCOME_EN.progress
        .replace("{{step}}", String(step))
        .replace("{{total}}", String(WELCOME_STEPS.length));
}

describe("the introduction", () => {
    /**
     * The walk is the point: an operator who cannot see how far along they are reads the second
     * screen as the start of an unknown number of them.
     */
    it("moves the operator on a step at a time", async () => {
        openWizard();
        expect(await screen.findByText(progress(1))).toBeInTheDocument();

        await userEvent.setup().click(screen.getByRole("button", { name: WELCOME_EN.setUp }));

        expect(await screen.findByText(HARNESS_SETUP_EN.title)).toBeInTheDocument();
        expect(screen.getByText(progress(2))).toBeInTheDocument();
    });

    /** Setting a lab up means leaving for a terminal, so a step has to survive being come back to. */
    it("opens a step of its own on the step that address names", async () => {
        openWizard(WelcomeStep.NOTIFICATIONS);

        expect(await screen.findByText(WELCOME_EN.notificationsTitle)).toBeInTheDocument();
        expect(screen.getByText(progress(3))).toBeInTheDocument();
    });
});
