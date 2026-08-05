import type { LabStorage } from "@openlab/protocol/lab-storage/lab-storage.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#src/design-system/tooltip";
import { LAB_MAINTENANCE_EN } from "#src/lab-maintenance/lab-maintenance.i18n";
import { LabStorageSection } from "#src/lab-maintenance/lab-storage-section";

const WORKSPACE_ROOT = "/Users/operator/projects/lab/.lab";

/** The lighter directory is served first, the way the daemon orders them: by id, not by size. */
const HELD: LabStorage = {
    workspace_root: WORKSPACE_ROOT,
    bytes: 3_670_016,
    runs: [
        {
            investigation_id: "investigation-1",
            goal: "Find a faster route planner",
            path: `${WORKSPACE_ROOT}/runs/investigation-1`,
            bytes: 524_288,
            file_count: 7
        },
        {
            investigation_id: "lab-legacy",
            goal: null,
            path: `${WORKSPACE_ROOT}/runs/lab-legacy`,
            bytes: 3_145_728,
            file_count: 42
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

/** The run directory drawn at `position`, counting past the header row the table opens with. */
async function runRow(position: number) {
    const table = await screen.findByRole("table", { name: LAB_MAINTENANCE_EN.runTable });
    const [, ...rows] = within(table).getAllByRole("row");
    const row = rows[position];
    if (row === undefined) {
        throw new Error(`The table drew no run directory at position ${position}.`);
    }
    return row;
}

describe("LabStorageSection", () => {
    it("sizes the lab and every run directory it holds", async () => {
        respond(HELD);
        renderSection();

        expect(await screen.findByText("3.5 MB")).toBeInTheDocument();
        expect(screen.getByText("3 MB")).toBeInTheDocument();
        expect(screen.getByText("512 KB")).toBeInTheDocument();
        expect(screen.getByText(`${WORKSPACE_ROOT}/runs/investigation-1`)).toBeInTheDocument();
    });

    it("counts the files the whole lab is holding, not one directory's", async () => {
        respond(HELD);
        renderSection();

        expect(await screen.findByText("49")).toBeInTheDocument();
    });

    it("puts the heaviest directory first, whatever order it was served in", async () => {
        respond(HELD);

        renderSection();

        expect(within(await runRow(0)).getByText("3 MB")).toBeInTheDocument();
    });

    it("meters each directory against what the whole lab takes", async () => {
        respond(HELD);
        renderSection();

        expect(within(await runRow(0)).getByText("86%")).toBeInTheDocument();
        expect(within(await runRow(1)).getByText("14%")).toBeInTheDocument();
    });

    it("names a directory the lab no longer holds an investigation for", async () => {
        respond(HELD);
        renderSection();

        expect(await screen.findByText(LAB_MAINTENANCE_EN.unheldRun)).toBeInTheDocument();
    });

    it("shows the emptied lab the daemon answered the purge with", async () => {
        respond(HELD);
        renderSection();
        await userEvent.click(
            await screen.findByRole("button", { name: LAB_MAINTENANCE_EN.purge })
        );

        await userEvent.click(
            screen.getByRole("button", { name: LAB_MAINTENANCE_EN.purgeConfirm })
        );

        expect(await screen.findByText(LAB_MAINTENANCE_EN.emptyTitle)).toBeInTheDocument();
        expect(screen.queryByText(LAB_MAINTENANCE_EN.unheldRun)).not.toBeInTheDocument();
    });

    it("asks before it purges, and purges nothing while the question stands", async () => {
        const request = respond(HELD);
        renderSection();

        await userEvent.click(
            await screen.findByRole("button", { name: LAB_MAINTENANCE_EN.purge })
        );

        expect(screen.getByRole("alertdialog")).toBeInTheDocument();
        expect(request.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    });

    it("says why there is no reading when the runtime does not report its disk", async () => {
        respond({ error: "Not found" }, PURGED, 404);
        renderSection();

        expect(await screen.findByText(LAB_MAINTENANCE_EN.unsupportedTitle)).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: LAB_MAINTENANCE_EN.purge })
        ).not.toBeInTheDocument();
    });
});
