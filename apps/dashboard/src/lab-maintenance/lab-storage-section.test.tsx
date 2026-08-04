import type { LabStorage } from "@lab/protocol/lab-storage/lab-storage.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#src/design-system/tooltip";
import {
    EMPTY_LAB_TITLE,
    NO_STORAGE_TITLE,
    PURGE_CONFIRM_LABEL,
    PURGE_LABEL,
    UNHELD_RUN_LABEL
} from "#src/lab-maintenance/lab-maintenance.const";
import { LabStorageSection } from "#src/lab-maintenance/lab-storage-section";

const WORKSPACE_ROOT = "/Users/operator/projects/lab/.lab";

const HELD: LabStorage = {
    workspace_root: WORKSPACE_ROOT,
    bytes: 3_670_016,
    runs: [
        {
            investigation_id: "investigation-1",
            goal: "Find a faster route planner",
            path: `${WORKSPACE_ROOT}/runs/investigation-1`,
            bytes: 3_145_728,
            file_count: 42
        },
        {
            investigation_id: "lab-legacy",
            goal: null,
            path: `${WORKSPACE_ROOT}/runs/lab-legacy`,
            bytes: 524_288,
            file_count: 7
        }
    ]
};

const PURGED: LabStorage = { workspace_root: WORKSPACE_ROOT, bytes: 0, runs: [] };

function respond(read: unknown, purged: unknown = PURGED, readStatus = 200) {
    const request = vi.fn((_url: string, init?: RequestInit) =>
        Promise.resolve(
            new Response(JSON.stringify(init?.method === "POST" ? purged : read), {
                status: init?.method === "POST" ? 200 : readStatus,
                headers: { "Content-Type": "application/json" }
            })
        )
    );
    vi.stubGlobal("fetch", request);
    return request;
}

function renderSection() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<LabStorageSection />, {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>
                <TooltipProvider>{children}</TooltipProvider>
            </QueryClientProvider>
        )
    });
}

describe("LabStorageSection", () => {
    it("sizes the lab and every run directory it holds", async () => {
        respond(HELD);
        renderSection();

        expect(await screen.findByText("3.5 MB")).toBeInTheDocument();
        expect(screen.getByText("3 MB · 42 files")).toBeInTheDocument();
        expect(screen.getByText(`${WORKSPACE_ROOT}/runs/investigation-1`)).toBeInTheDocument();
    });

    it("names a directory the lab no longer holds an investigation for", async () => {
        respond(HELD);
        renderSection();

        expect(await screen.findByText(UNHELD_RUN_LABEL)).toBeInTheDocument();
    });

    it("shows the emptied lab the daemon answered the purge with", async () => {
        respond(HELD);
        renderSection();
        await userEvent.click(await screen.findByRole("button", { name: PURGE_LABEL }));

        await userEvent.click(screen.getByRole("button", { name: PURGE_CONFIRM_LABEL }));

        expect(await screen.findByText(EMPTY_LAB_TITLE)).toBeInTheDocument();
        expect(screen.queryByText(UNHELD_RUN_LABEL)).not.toBeInTheDocument();
    });

    it("asks before it purges, and purges nothing while the question stands", async () => {
        const request = respond(HELD);
        renderSection();

        await userEvent.click(await screen.findByRole("button", { name: PURGE_LABEL }));

        expect(screen.getByRole("alertdialog")).toBeInTheDocument();
        expect(request.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    });

    it("says why there is no reading when the runtime does not report its disk", async () => {
        respond({ error: "Not found" }, PURGED, 404);
        renderSection();

        expect(await screen.findByText(NO_STORAGE_TITLE)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: PURGE_LABEL })).not.toBeInTheDocument();
    });
});
