import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HARNESS_NAME } from "#src/agent-harness/harness-name.const";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { TooltipProvider } from "#src/design-system/tooltip";
import { INVESTIGATION_ROSTER_EN } from "#src/investigation-roster/investigation-roster.i18n";
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

function renderLab() {
    return render(<RouterProvider router={createMemoryRouter(dashboardRoutes)} />, {
        wrapper: wrapper()
    });
}

/** Answers the roster on GET, and whatever the caller wants on everything else. */
function serveRoster(roster: unknown, written: unknown = statusFixture) {
    const fetchMock = vi.fn((_input: string, init?: RequestInit) =>
        Promise.resolve(
            new Response(JSON.stringify(init?.method === undefined ? roster : written), {
                status: init?.method === "DELETE" ? 204 : 200,
                headers: { "Content-Type": "application/json" }
            })
        )
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

describe("InvestigationRoster", () => {
    beforeEach(() => {
        FakeEventSource.reset();
        vi.stubGlobal("EventSource", FakeEventSource);
    });

    it("lists every investigation the lab holds, each linking to its own dashboard", async () => {
        serveRoster(rosterFixture);
        renderLab();

        const list = await screen.findByRole("list", { name: INVESTIGATION_ROSTER_EN.title });
        const entries = within(list).getAllByRole("listitem");

        expect(entries).toHaveLength(2);
        expect(
            within(list).getByRole("link", { name: rosterFixture[0]?.goal ?? "missing" })
        ).toHaveAttribute("href", "/investigations/investigation-alpha-2026");
        expect(within(entries[0] as HTMLElement).getByText("1 of 2")).toBeInTheDocument();
    });

    it("says the lab is idle rather than showing an empty list", async () => {
        serveRoster([]);
        renderLab();

        expect(await screen.findByText(INVESTIGATION_ROSTER_EN.emptyTitle)).toBeInTheDocument();
        expect(screen.queryByRole("list", { name: INVESTIGATION_ROSTER_EN.title })).toBeNull();
    });

    it("starts an investigation on the goal and roster the operator chose", async () => {
        const fetchMock = serveRoster(rosterFixture);
        const user = userEvent.setup();
        renderLab();

        await user.click(
            await screen.findByRole("button", { name: INVESTIGATION_ROSTER_EN.newInvestigation })
        );
        const composer = await screen.findByRole("dialog", {
            name: INVESTIGATION_ROSTER_EN.newInvestigation
        });
        await user.type(
            within(composer).getByLabelText(INVESTIGATION_ROSTER_EN.goalLabel),
            "Measure the eviction tail"
        );
        await user.click(
            within(composer).getByRole("checkbox", { name: HARNESS_NAME[AgentHarnessKind.CLAUDE] })
        );
        await user.click(
            within(composer).getByRole("button", { name: INVESTIGATION_ROSTER_EN.start })
        );

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                "/api/investigations",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({
                        goal: "Measure the eviction tail",
                        harness_kinds: [AgentHarnessKind.CODEX, AgentHarnessKind.GLM]
                    })
                })
            );
        });
    });

    it("starts nothing and keeps nothing when the operator backs out of the composer", async () => {
        const fetchMock = serveRoster(rosterFixture);
        const user = userEvent.setup();
        renderLab();

        await user.click(
            await screen.findByRole("button", { name: INVESTIGATION_ROSTER_EN.newInvestigation })
        );
        const composer = await screen.findByRole("dialog", {
            name: INVESTIGATION_ROSTER_EN.newInvestigation
        });
        await user.type(
            within(composer).getByLabelText(INVESTIGATION_ROSTER_EN.goalLabel),
            "Measure the eviction tail"
        );
        await user.click(
            within(composer).getByRole("button", { name: INVESTIGATION_ROSTER_EN.cancel })
        );

        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);

        await user.click(
            screen.getByRole("button", { name: INVESTIGATION_ROSTER_EN.newInvestigation })
        );
        const reopened = await screen.findByRole("dialog", {
            name: INVESTIGATION_ROSTER_EN.newInvestigation
        });
        expect(within(reopened).getByLabelText(INVESTIGATION_ROSTER_EN.goalLabel)).toHaveValue("");
    });

    it("asks the lab to discard the investigation the operator picked", async () => {
        const fetchMock = serveRoster(rosterFixture);
        const user = userEvent.setup();
        renderLab();

        const list = await screen.findByRole("list", { name: INVESTIGATION_ROSTER_EN.title });
        const [, second] = within(list).getAllByRole("listitem");
        await user.click(within(second as HTMLElement).getByRole("button", { name: "Discard" }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                "/api/investigations/investigation-beta-2026",
                expect.objectContaining({ method: "DELETE" })
            );
        });
    });
});
