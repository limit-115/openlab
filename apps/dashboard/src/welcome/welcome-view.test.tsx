import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { WELCOME_EN } from "#src/welcome/welcome.i18n";
import { hasBeenIntroduced } from "#src/welcome/welcome-introduction";
import { WelcomeView } from "#src/welcome/welcome-view";

afterEach(() => {
    localStorage.clear();
});

function renderWelcome() {
    return render(
        <MemoryRouter>
            <WelcomeView />
        </MemoryRouter>
    );
}

async function press(label: string) {
    await userEvent.setup().click(screen.getByRole("button", { name: label }));
}

describe("WelcomeView", () => {
    it("counts as read once the operator has gone on from it", async () => {
        renderWelcome();
        expect(hasBeenIntroduced()).toBe(false);

        await press(WELCOME_EN.continue);

        expect(hasBeenIntroduced()).toBe(true);
    });

    /** Deciding it is not needed is an answer, and asking again every morning ignores it. */
    it("counts as read once the operator has said they do not need it", async () => {
        renderWelcome();

        await press(WELCOME_EN.skip);

        expect(hasBeenIntroduced()).toBe(true);
    });
});
