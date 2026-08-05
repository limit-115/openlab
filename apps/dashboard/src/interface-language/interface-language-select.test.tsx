import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import {
    DEFAULT_LOCALE,
    LOCALE_LABEL,
    Locale
} from "#src/interface-language/interface-language.const";
import { INTERFACE_LANGUAGE_EN } from "#src/interface-language/interface-language.i18n";
import { InterfaceLanguageSelect } from "#src/interface-language/interface-language-select";
import { StatusTag } from "#src/status-tag/status-tag";
import { STATUS_TAG_EN, STATUS_TAG_RU } from "#src/status-tag/status-tag.i18n";

afterEach(async () => {
    localStorage.clear();
    await i18next.changeLanguage(DEFAULT_LOCALE);
});

/** The pill stands beside the control so the switch can be watched landing on copy of its own. */
function renderSelect() {
    return render(
        <>
            <InterfaceLanguageSelect />
            <StatusTag status={AgentRunStatus.RUNNING} />
        </>
    );
}

function control() {
    return screen.getByRole("combobox", { name: INTERFACE_LANGUAGE_EN.label });
}

describe("InterfaceLanguageSelect", () => {
    /** The control is read far more often than it is changed, so it has to say where it stands. */
    it("stands on the language the interface is currently written in", () => {
        renderSelect();

        expect(within(control()).getByText(LOCALE_LABEL[DEFAULT_LOCALE])).toBeInTheDocument();
    });

    it("rewrites the interface in the language chosen from the list", async () => {
        renderSelect();
        const operator = userEvent.setup();

        await operator.click(control());
        await operator.click(await screen.findByRole("option", { name: LOCALE_LABEL[Locale.RU] }));

        expect(await screen.findByText(STATUS_TAG_RU.running)).toBeInTheDocument();
        expect(screen.queryByText(STATUS_TAG_EN.running)).toBeNull();
    });
});
