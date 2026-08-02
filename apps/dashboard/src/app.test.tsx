import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "#src/app";
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
        render(<App />, { wrapper: wrapper() });

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
        render(<App />, { wrapper: wrapper() });

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

    it("names the harness, model and effort behind a running agent", async () => {
        respondWith(statusFixture);
        render(<App />, { wrapper: wrapper() });

        expect(await screen.findByText("Codex · gpt-5.6-sol · medium effort")).toBeInTheDocument();
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
        render(<App />, { wrapper: wrapper() });

        expect(await screen.findByText("Frontier is being mapped")).toBeInTheDocument();
        expect(screen.getByText("No research branches yet")).toBeInTheDocument();
        expect(screen.getByText("No claims recorded")).toBeInTheDocument();
        expect(screen.getByText("No experiments yet")).toBeInTheDocument();
        expect(screen.getByText("All capabilities available")).toBeInTheDocument();
    });
});
