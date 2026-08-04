import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SettingsView } from "#src/dashboard-routes/settings-view";
import { HARNESS_SETTINGS_TITLE } from "#src/harness-settings/harness-settings.const";
import { LabStorageEndpoint, STORAGE_TITLE } from "#src/lab-maintenance/lab-maintenance.const";

/** Nothing the page reads is served, so a block that is open falls back to its empty state. */
function respondWithNothing() {
    const request = vi.fn((_url: string) =>
        Promise.resolve(new Response(JSON.stringify({ error: "Not found" }), { status: 404 }))
    );
    vi.stubGlobal("fetch", request);
    return request;
}

function renderSettings() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<SettingsView />, {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        )
    });
}

function reached(request: ReturnType<typeof respondWithNothing>, endpoint: string): boolean {
    return request.mock.calls.some(([url]) => url === endpoint);
}

describe("SettingsView", () => {
    it("holds a block back until its tab is opened, daemon and all", async () => {
        const request = respondWithNothing();
        renderSettings();

        expect(
            await screen.findByRole("heading", { name: HARNESS_SETTINGS_TITLE })
        ).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: STORAGE_TITLE })).toBeNull();
        expect(reached(request, LabStorageEndpoint.USAGE)).toBe(false);

        await userEvent.click(screen.getByRole("tab", { name: STORAGE_TITLE }));

        expect(await screen.findByRole("heading", { name: STORAGE_TITLE })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: HARNESS_SETTINGS_TITLE })).toBeNull();
        expect(reached(request, LabStorageEndpoint.USAGE)).toBe(true);
    });
});
