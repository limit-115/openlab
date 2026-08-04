import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "#src/design-system/sidebar";
import { InvestigationControls } from "#src/investigation-control/investigation-controls";
import { statusQueryKey } from "#src/live-status/status-client";
import { statusFixture } from "#src/test-support/status-fixture";

function answerWith(payload: unknown, status = 200) {
    const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), {
            status,
            headers: { "Content-Type": "application/json" }
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function renderControls(state: InvestigationState) {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const view = render(
        <QueryClientProvider client={client}>
            <SidebarProvider>
                <InvestigationControls investigationId="investigation-alpha-2026" state={state} />
            </SidebarProvider>
        </QueryClientProvider>
    );
    return { ...view, client };
}

describe("InvestigationControls", () => {
    it("wakes a hibernating investigation and takes the daemon's snapshot as the new truth", async () => {
        const woken = {
            ...statusFixture,
            investigation: { ...statusFixture.investigation, state: InvestigationState.RUNNING }
        };
        const fetchMock = answerWith(woken);
        const user = userEvent.setup();
        const { client } = renderControls(InvestigationState.HIBERNATING);

        await user.click(screen.getByRole("button", { name: "Wake" }));

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/investigations/investigation-alpha-2026/wake",
            expect.objectContaining({ method: "POST" })
        );
        await vi.waitFor(() =>
            expect(client.getQueryData(statusQueryKey("investigation-alpha-2026"))).toMatchObject({
                investigation: { state: InvestigationState.RUNNING }
            })
        );
    });

    it("names the consequence and asks before it ends the run", async () => {
        const fetchMock = answerWith(statusFixture);
        const user = userEvent.setup();
        renderControls(InvestigationState.RUNNING);

        await user.click(screen.getByRole("button", { name: "Stop" }));

        expect(
            screen.getByText(/whatever they had in hand is lost/, { exact: false })
        ).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Stop the run" }));

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/investigations/investigation-alpha-2026/stop",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("puts a running investigation to sleep without asking, since waking it is one click back", async () => {
        const paused = {
            ...statusFixture,
            investigation: { ...statusFixture.investigation, state: InvestigationState.HIBERNATING }
        };
        const fetchMock = answerWith(paused);
        const user = userEvent.setup();
        const { client } = renderControls(InvestigationState.RUNNING);

        await user.click(screen.getByRole("button", { name: "Pause" }));

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/investigations/investigation-alpha-2026/pause",
            expect.objectContaining({ method: "POST" })
        );
        await vi.waitFor(() =>
            expect(client.getQueryData(statusQueryKey("investigation-alpha-2026"))).toMatchObject({
                investigation: { state: InvestigationState.HIBERNATING }
            })
        );
    });

    it("starts a stopped run again rather than leaving it settled", async () => {
        const restarted = {
            ...statusFixture,
            investigation: { ...statusFixture.investigation, state: InvestigationState.RUNNING }
        };
        const fetchMock = answerWith(restarted);
        const user = userEvent.setup();
        const { client } = renderControls(InvestigationState.STOPPED);

        await user.click(screen.getByRole("button", { name: "Start" }));

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/investigations/investigation-alpha-2026/wake",
            expect.objectContaining({ method: "POST" })
        );
        await vi.waitFor(() =>
            expect(client.getQueryData(statusQueryKey("investigation-alpha-2026"))).toMatchObject({
                investigation: { state: InvestigationState.RUNNING }
            })
        );
    });

    it("carries a breakthrough further instead of stranding the run on it", async () => {
        const carried = {
            ...statusFixture,
            investigation: { ...statusFixture.investigation, state: InvestigationState.RUNNING }
        };
        const fetchMock = answerWith(carried);
        const user = userEvent.setup();
        renderControls(InvestigationState.BREAKTHROUGH);

        expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Resume" }));

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/investigations/investigation-alpha-2026/wake",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("leaves the run untouched when the operator backs out of the stop", async () => {
        const fetchMock = answerWith(statusFixture);
        const user = userEvent.setup();
        renderControls(InvestigationState.RUNNING);

        await user.click(screen.getByRole("button", { name: "Stop" }));
        await user.click(screen.getByRole("button", { name: "Keep running" }));

        expect(fetchMock).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    });

    it("offers no wake to an investigation that is already running", () => {
        renderControls(InvestigationState.RUNNING);

        expect(screen.queryByRole("button", { name: "Wake" })).not.toBeInTheDocument();
    });

    it("offers nothing to a failed run, which is the one the investigation will not reopen", () => {
        renderControls(InvestigationState.FAILED);

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows the daemon's refusal instead of pretending the control worked", async () => {
        answerWith({ error: "Cannot wake investigation from RUNNING" }, 409);
        const user = userEvent.setup();
        renderControls(InvestigationState.HIBERNATING);

        await user.click(screen.getByRole("button", { name: "Wake" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Cannot wake investigation from RUNNING"
        );
    });
});
