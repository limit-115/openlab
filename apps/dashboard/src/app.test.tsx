import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { TooltipProvider } from "#src/design-system/tooltip";
import { FakeEventSource } from "#src/test-support/fake-event-source";
import { statusFixture } from "#src/test-support/status-fixture";

function wrapper() {
    const client = new QueryClient({
        defaultOptions: {
            queries: { retry: false }
        }
    });

    return function QueryWrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={client}>
                <TooltipProvider>{children}</TooltipProvider>
            </QueryClientProvider>
        );
    };
}

function renderDashboard() {
    return render(<RouterProvider router={createMemoryRouter(dashboardRoutes)} />, {
        wrapper: wrapper()
    });
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

describe("App", () => {
    beforeEach(() => {
        FakeEventSource.reset();
        vi.stubGlobal("EventSource", FakeEventSource);
    });

    it("renders the operational snapshot and claim filters", async () => {
        respondWith(statusFixture);
        const user = userEvent.setup();
        renderDashboard();

        expect(await screen.findByText(statusFixture.lab.goal)).toBeInTheDocument();
        expect(screen.getByText("Landmark heuristics")).toBeInTheDocument();
        expect(
            screen.getByText(statusFixture.claims[0]?.statement ?? "missing")
        ).toBeInTheDocument();
        expect(screen.getByText("Independent road-network benchmark dataset")).toBeInTheDocument();
        expect(screen.getByText("Held-out benchmark started")).toBeInTheDocument();

        await user.click(screen.getByRole("radio", { name: "Refuted" }));
        expect(screen.getByText("No matching claims")).toBeInTheDocument();
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
            `lab provide ${statusFixture.capability_requests[0]?.id} <resource-reference>`
        );
    });

    it("reads the stage of the cycle the lab is on off its agents", async () => {
        respondWith(statusFixture);
        renderDashboard();

        const cycle = await screen.findByRole("list", { name: "Research cycle" });
        const researchers = within(cycle).getByText("Researchers").closest("li");

        expect(researchers?.textContent).toContain("1 working");
        expect(within(cycle).getByText("Verifier").closest("li")?.textContent).toContain(
            "Not reached yet"
        );
    });

    it("wakes a hibernating lab from the header and settles on the state it reports", async () => {
        const hibernating = {
            ...statusFixture,
            lab: { ...statusFixture.lab, state: LabState.HIBERNATING }
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
        expect(await within(runtime).findByText(LabState.RUNNING)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Wake" })).not.toBeInTheDocument();
    });

    it("shows useful empty states while the lab is still mapping the goal", async () => {
        respondWith({
            ...statusFixture,
            frontier: {
                ...statusFixture.frontier,
                known: [],
                open_questions: [],
                blockers: [],
                next_experiments: []
            },
            branches: [],
            agents: [],
            tasks: [],
            claims: [],
            experiments: [],
            capability_requests: [],
            recent_events: []
        });
        renderDashboard();

        expect(await screen.findByText("Frontier is being mapped")).toBeInTheDocument();
        expect(screen.getByText("No research branches yet")).toBeInTheDocument();
        expect(screen.getByText("No claims recorded")).toBeInTheDocument();
        expect(screen.getByText("No experiments yet")).toBeInTheDocument();
    });

    it("spends no room on capability requests while the lab is not blocked", async () => {
        respondWith({ ...statusFixture, capability_requests: [] });
        renderDashboard();

        expect(await screen.findByText(statusFixture.lab.goal)).toBeInTheDocument();
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
