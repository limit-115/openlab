import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { TooltipProvider } from "#src/design-system/tooltip";
import { INVESTIGATION_STATE_LABEL } from "#src/investigation-state/investigation-state-display.const";
import { FakeEventSource } from "#src/test-support/fake-event-source";
import { statusFixture } from "#src/test-support/status-fixture";
import { ThemeProvider } from "#src/theme/theme-provider";

function wrapper() {
    const client = new QueryClient({
        defaultOptions: {
            queries: { retry: false }
        }
    });

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

function renderDashboard() {
    const router = createMemoryRouter(dashboardRoutes, {
        initialEntries: [`/investigations/${statusFixture.investigation.id}`]
    });
    return render(<RouterProvider router={router} />, { wrapper: wrapper() });
}

function respondWith(payload: unknown) {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
            new Response(JSON.stringify(payload), {
                headers: { "Content-Type": "application/json" }
            })
        )
    );
}

describe("InvestigationShell", () => {
    beforeEach(() => {
        FakeEventSource.reset();
        vi.stubGlobal("EventSource", FakeEventSource);
    });

    it("renders the bets, what was claimed under them and what is blocked", async () => {
        respondWith(statusFixture);
        renderDashboard();

        expect(
            await screen.findByRole("heading", { name: statusFixture.investigation.goal })
        ).toBeInTheDocument();
        expect(
            screen.getByText(statusFixture.assumptions[0]?.statement ?? "missing")
        ).toBeInTheDocument();
        expect(
            screen.getByText(statusFixture.assumptions[1]?.outcome ?? "missing")
        ).toBeInTheDocument();
        expect(screen.getByText(statusFixture.findings[0]?.claim ?? "missing")).toBeInTheDocument();
        expect(screen.getByText("Independent road-network benchmark dataset")).toBeInTheDocument();
        expect(
            screen.getByText("The researcher claims a 42% cut in node expansions")
        ).toBeInTheDocument();
    });

    it("puts the whole event payload and the provisioning command on the clipboard", async () => {
        respondWith(statusFixture);
        const user = userEvent.setup();
        const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
        renderDashboard();

        const [copyPayload] = await screen.findAllByRole("button", {
            name: "Copy the event payload"
        });
        await user.click(copyPayload as HTMLElement);
        const newestEvent = [...statusFixture.recent_events].sort((left, right) =>
            right.occurred_at.localeCompare(left.occurred_at)
        )[0];
        expect(writeText).toHaveBeenLastCalledWith(JSON.stringify(newestEvent?.payload, null, 4));

        await user.click(screen.getByRole("button", { name: "Copy the provisioning command" }));
        expect(writeText).toHaveBeenLastCalledWith(
            `lab answer ${statusFixture.capability_requests[0]?.id} <answer>`
        );
    });

    it("reads the stage of the cycle the investigation is on off its runs", async () => {
        respondWith(statusFixture);
        renderDashboard();

        const cycle = await screen.findByRole("list", { name: "Research cycle" });
        const researchers = within(cycle).getByText("Researchers").closest("li");

        expect(researchers?.textContent).toContain("1 working");
        expect(within(cycle).getByText("Verifiers").closest("li")?.textContent).toContain(
            "Not reached yet"
        );
    });

    it("wakes a hibernating investigation from the sidebar and settles on the state it reports", async () => {
        const hibernating = {
            ...statusFixture,
            investigation: { ...statusFixture.investigation, state: InvestigationState.HIBERNATING }
        };
        vi.stubGlobal(
            "fetch",
            vi.fn((_input: string, init?: RequestInit) =>
                Promise.resolve(
                    new Response(
                        JSON.stringify(init?.method === "POST" ? statusFixture : hibernating),
                        { headers: { "Content-Type": "application/json" } }
                    )
                )
            )
        );
        const user = userEvent.setup();
        renderDashboard();

        await user.click(await screen.findByRole("button", { name: "Wake" }));

        const runtime = screen.getByRole("status", { name: "Lab runtime status" });
        expect(
            await within(runtime).findByText(INVESTIGATION_STATE_LABEL[InvestigationState.RUNNING])
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Wake" })).not.toBeInTheDocument();
    });

    it("shows useful empty states while the investigation is still mapping the goal", async () => {
        respondWith({
            ...statusFixture,
            assumptions: [],
            runs: [],
            findings: [],
            verdicts: [],
            capability_requests: [],
            recent_events: []
        });
        renderDashboard();

        expect(await screen.findByText("No bets placed yet")).toBeInTheDocument();
    });

    it("spends no room on capability requests while the investigation is not blocked", async () => {
        respondWith({ ...statusFixture, capability_requests: [] });
        renderDashboard();

        expect(
            await screen.findByRole("heading", { name: statusFixture.investigation.goal })
        ).toBeInTheDocument();
        expect(screen.queryByRole("list", { name: "Capability requests" })).toBeNull();
    });

    it("counts up how long a capability request has been waiting on the operator", async () => {
        respondWith(statusFixture);
        renderDashboard();

        const requests = await screen.findByRole("list", { name: "Capability requests" });

        expect(within(requests).getByText(/Waiting for you/)).toBeInTheDocument();
        expect(
            within(requests).getByText(statusFixture.capability_requests[0]?.reason ?? "missing")
        ).toBeInTheDocument();
    });
});
