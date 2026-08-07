import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarMenu, SidebarProvider } from "#src/design-system/sidebar";
import { TooltipProvider } from "#src/design-system/tooltip";
import { NewerReleaseEntry } from "#src/release-notice/newer-release-entry";

const NEWER = {
    running_version: "0.1.0",
    newer: {
        offered_version: "0.2.0",
        notes_url: "https://github.com/dibenkobit/openlab/releases/tag/v0.2.0"
    }
};

function answering(status: number, body?: unknown) {
    vi.stubGlobal(
        "fetch",
        vi.fn(
            async () => new Response(body === undefined ? null : JSON.stringify(body), { status })
        )
    );
}

function renderEntry() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={client}>
                <TooltipProvider>
                    <SidebarProvider>
                        <SidebarMenu>{children}</SidebarMenu>
                    </SidebarProvider>
                </TooltipProvider>
            </QueryClientProvider>
        );
    }

    return render(<NewerReleaseEntry />, { wrapper: Wrapper });
}

describe("the sidebar saying a release the lab does not have is out", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("links to what changed in the release it names", async () => {
        answering(200, NEWER);

        renderEntry();

        const entry = await screen.findByRole("link", { name: /0\.2\.0/ });
        expect(entry).toHaveAttribute("href", NEWER.newer.notes_url);
    });

    /**
     * A page that could replace the program from a stray click, while the lab it is watching
     * researches, would be worse than one that says where to read about the release.
     */
    it("offers reading about it rather than installing it", async () => {
        answering(200, NEWER);

        renderEntry();

        await screen.findByRole("link", { name: /0\.2\.0/ });
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("says nothing when the lab is on the release the channel offers", async () => {
        answering(200, { running_version: "0.2.0", newer: null });

        renderEntry();

        await waitFor(() => expect(fetch).toHaveBeenCalled());
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    /** A lab run from its sources has no installation for a release to be newer than. */
    it("says nothing when the lab does not answer about releases at all", async () => {
        answering(404);

        renderEntry();

        await waitFor(() => expect(fetch).toHaveBeenCalled());
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
});
