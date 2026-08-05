import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LAB_NAME } from "#src/brand/brand.const";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { investigationAddress, LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { TooltipProvider } from "#src/design-system/tooltip";
import { LAB_LAYOUT_EN } from "#src/lab-layout/lab-layout.i18n";
import { FakeEventSource } from "#src/test-support/fake-event-source";
import { rosterFixture } from "#src/test-support/roster-fixture";
import { statusFixture } from "#src/test-support/status-fixture";
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

    /**
     * The mark carries the lab's name and so does the word beside it, which is right for the eye
     * and wrong for the ear: found by what only the subtitle can say, the head is then asked what
     * it is called, and a mark left audible answers with the name twice over.
     */
    it("gives its own name once, though both the mark and the word carry it", async () => {
        renderAt(LabRoute.ROSTER);

        const head = await within(sidebar()).findByRole("link", {
            name: new RegExp(LAB_LAYOUT_EN.subtitle)
        });

        /** Anchored, and loose about the join: what is being counted is the name, not the spacing. */
        expect(head).toHaveAccessibleName(new RegExp(`^${LAB_NAME}\\s*${LAB_LAYOUT_EN.subtitle}$`));
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

    it("marks the open investigation alone, and not the roster it was reached from", async () => {
        renderAt(investigationAddress(investigationId));

        await waitFor(() => expect(entry(goal)).toHaveAttribute("data-active", "true"));
        expect(entry(otherGoal)).toHaveAttribute("data-active", "false");
        expect(entry("Investigations")).toHaveAttribute("data-active", "false");
    });
});
