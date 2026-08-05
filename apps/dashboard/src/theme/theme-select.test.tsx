import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY, Theme } from "#src/theme/theme.const";
import { THEME_EN } from "#src/theme/theme.i18n";
import { ThemeProvider } from "#src/theme/theme-provider";
import { ThemeSelect } from "#src/theme/theme-select";

afterEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
});

function renderSelect() {
    return render(
        <ThemeProvider>
            <ThemeSelect />
        </ThemeProvider>
    );
}

function control() {
    return screen.getByRole("combobox", { name: THEME_EN.label });
}

describe("ThemeSelect", () => {
    /** The control is read far more often than it is changed, so it has to say where it stands. */
    it("stands on the palette the dashboard is currently painted in", () => {
        localStorage.setItem(THEME_STORAGE_KEY, Theme.LIGHT);

        renderSelect();

        expect(within(control()).getByText(THEME_EN[Theme.LIGHT])).toBeInTheDocument();
    });

    it("repaints the document in the palette chosen from the list", async () => {
        renderSelect();
        const operator = userEvent.setup();

        await operator.click(control());
        await operator.click(await screen.findByRole("option", { name: THEME_EN[Theme.LIGHT] }));

        expect(document.documentElement).toHaveClass(Theme.LIGHT, "scheme-light");
        expect(document.documentElement).not.toHaveClass(Theme.DARK);
    });
});
