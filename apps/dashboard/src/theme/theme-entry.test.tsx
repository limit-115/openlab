import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "#src/design-system/sidebar";
import { FakeMediaQuery } from "#src/test-support/fake-media-query";
import { THEME_LABEL, THEME_STORAGE_KEY, Theme } from "#src/theme/theme.const";
import { ThemeEntry } from "#src/theme/theme-entry";
import { THEME_ENTRY_LABEL } from "#src/theme/theme-entry.const";
import { ThemeProvider } from "#src/theme/theme-provider";

afterEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
});

function renderEntry() {
    return render(
        <ThemeProvider>
            <SidebarProvider>
                <ThemeEntry />
            </SidebarProvider>
        </ThemeProvider>
    );
}

async function choose(label: string) {
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: THEME_ENTRY_LABEL }));
    await user.click(await screen.findByRole("menuitem", { name: label }));
}

describe("ThemeEntry", () => {
    it("repaints the document in the chosen palette and keeps the choice for the next visit", async () => {
        renderEntry();

        await choose(THEME_LABEL[Theme.LIGHT]);

        expect(document.documentElement).toHaveClass(Theme.LIGHT, "scheme-light");
        expect(document.documentElement).not.toHaveClass(Theme.DARK);
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(Theme.LIGHT);
    });

    it("opens in the palette the operator last chose", () => {
        localStorage.setItem(THEME_STORAGE_KEY, Theme.LIGHT);

        renderEntry();

        expect(document.documentElement).toHaveClass(Theme.LIGHT, "scheme-light");
    });

    it("keeps following the machine after the operator hands the choice back to it", async () => {
        const systemDark = new FakeMediaQuery();
        vi.stubGlobal("matchMedia", () => systemDark);
        renderEntry();

        await choose("System");
        expect(document.documentElement).toHaveClass(Theme.LIGHT);

        act(() => systemDark.flipTo(true));

        expect(document.documentElement).toHaveClass(Theme.DARK, "scheme-dark");
    });
});
