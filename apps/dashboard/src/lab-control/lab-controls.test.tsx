import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LabControls } from "#src/lab-control/lab-controls";
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

function renderControls(state: LabState) {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const view = render(
        <QueryClientProvider client={client}>
            <LabControls state={state} />
        </QueryClientProvider>
    );
    return { ...view, client };
}

describe("LabControls", () => {
    it("wakes a hibernating lab and takes the daemon's snapshot as the new truth", async () => {
        const woken = { ...statusFixture, lab: { ...statusFixture.lab, state: LabState.RUNNING } };
        const fetchMock = answerWith(woken);
        const user = userEvent.setup();
        const { client } = renderControls(LabState.HIBERNATING);

        await user.click(screen.getByRole("button", { name: "Wake" }));

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/wake",
            expect.objectContaining({ method: "POST" })
        );
        await vi.waitFor(() =>
            expect(client.getQueryData(statusQueryKey)).toMatchObject({
                lab: { state: LabState.RUNNING }
            })
        );
    });

    it("names the consequence and asks before it ends the run", async () => {
        const fetchMock = answerWith(statusFixture);
        const user = userEvent.setup();
        renderControls(LabState.RUNNING);

        await user.click(screen.getByRole("button", { name: "Stop" }));

        expect(
            screen.getByText(/whatever they had in hand is lost/, { exact: false })
        ).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Stop the run" }));

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/stop",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("puts a running lab to sleep without asking, since waking it is one click back", async () => {
        const paused = {
            ...statusFixture,
            lab: { ...statusFixture.lab, state: LabState.HIBERNATING }
        };
        const fetchMock = answerWith(paused);
        const user = userEvent.setup();
        const { client } = renderControls(LabState.RUNNING);

        await user.click(screen.getByRole("button", { name: "Pause" }));

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/pause",
            expect.objectContaining({ method: "POST" })
        );
        await vi.waitFor(() =>
            expect(client.getQueryData(statusQueryKey)).toMatchObject({
                lab: { state: LabState.HIBERNATING }
            })
        );
    });

    it("starts a stopped run again rather than leaving it settled", async () => {
        const restarted = {
            ...statusFixture,
            lab: { ...statusFixture.lab, state: LabState.RUNNING }
        };
        const fetchMock = answerWith(restarted);
        const user = userEvent.setup();
        const { client } = renderControls(LabState.STOPPED);

        await user.click(screen.getByRole("button", { name: "Start" }));

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/wake",
            expect.objectContaining({ method: "POST" })
        );
        await vi.waitFor(() =>
            expect(client.getQueryData(statusQueryKey)).toMatchObject({
                lab: { state: LabState.RUNNING }
            })
        );
    });

    it("carries a breakthrough further instead of stranding the run on it", async () => {
        const carried = {
            ...statusFixture,
            lab: { ...statusFixture.lab, state: LabState.RUNNING }
        };
        const fetchMock = answerWith(carried);
        const user = userEvent.setup();
        renderControls(LabState.BREAKTHROUGH);

        expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Resume" }));

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/wake",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("leaves the run untouched when the operator backs out of the stop", async () => {
        const fetchMock = answerWith(statusFixture);
        const user = userEvent.setup();
        renderControls(LabState.RUNNING);

        await user.click(screen.getByRole("button", { name: "Stop" }));
        await user.click(screen.getByRole("button", { name: "Keep running" }));

        expect(fetchMock).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    });

    it("offers no wake to a lab that is already running", () => {
        renderControls(LabState.RUNNING);

        expect(screen.queryByRole("button", { name: "Wake" })).not.toBeInTheDocument();
    });

    it("offers nothing to a failed run, which is the one the lab will not reopen", () => {
        renderControls(LabState.FAILED);

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows the daemon's refusal instead of pretending the control worked", async () => {
        answerWith({ error: "Cannot wake lab from RUNNING" }, 409);
        const user = userEvent.setup();
        renderControls(LabState.HIBERNATING);

        await user.click(screen.getByRole("button", { name: "Wake" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Cannot wake lab from RUNNING");
    });
});
