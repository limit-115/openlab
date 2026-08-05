import { AgentRunStatus } from "@nightlab/protocol/agent-runs/agent-run-status.const";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import { SidebarProvider } from "#src/design-system/sidebar";
import {
    DEFAULT_LOCALE,
    LOCALE_LABEL,
    LOCALE_STORAGE_KEY,
    Locale
} from "#src/interface-language/interface-language.const";
import { INTERFACE_LANGUAGE_EN } from "#src/interface-language/interface-language.i18n";
import { LanguageEntry } from "#src/interface-language/language-entry";
import { StatusTag } from "#src/status-tag/status-tag";
import { STATUS_TAG_EN, STATUS_TAG_RU } from "#src/status-tag/status-tag.i18n";

afterEach(async () => {
    localStorage.clear();
    await i18next.changeLanguage(DEFAULT_LOCALE);
});

/** The pill stands beside the control so the switch can be watched landing on copy of its own. */
function renderEntry() {
    return render(
        <SidebarProvider>
            <LanguageEntry />
            <StatusTag status={AgentRunStatus.RUNNING} />
        </SidebarProvider>
    );
}

async function choose(locale: Locale) {
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: INTERFACE_LANGUAGE_EN.label }));
    await user.click(await screen.findByRole("menuitemradio", { name: LOCALE_LABEL[locale] }));
}

describe("LanguageEntry", () => {
    it("rewrites the interface in the chosen language and keeps the choice for the next visit", async () => {
        renderEntry();
        expect(screen.getByText(STATUS_TAG_EN.running)).toBeInTheDocument();

        await choose(Locale.RU);

        expect(await screen.findByText(STATUS_TAG_RU.running)).toBeInTheDocument();
        expect(screen.queryByText(STATUS_TAG_EN.running)).toBeNull();
        expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe(Locale.RU);
    });

    it("tells the browser which language it is now reading out", async () => {
        renderEntry();

        await choose(Locale.RU);

        expect(document.documentElement).toHaveAttribute("lang", Locale.RU);
    });
});
