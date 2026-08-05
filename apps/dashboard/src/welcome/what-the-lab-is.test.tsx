import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { WELCOME_EN } from "#src/welcome/welcome.i18n";
import { hasBeenIntroduced } from "#src/welcome/welcome-introduction";
import { WhatTheLabIs } from "#src/welcome/what-the-lab-is";

afterEach(() => {
    localStorage.clear();
});

function renderWelcome() {
    return render(
        <MemoryRouter>
            <WhatTheLabIs />
        </MemoryRouter>
    );
}

async function press(label: string) {
    await userEvent.setup().click(screen.getByRole("button", { name: label }));
}

describe("WhatTheLabIs", () => {
    /** Deciding the setup is not needed is an answer, and asking again every morning ignores it. */
    it("counts as read once the operator has said they do not need the setup", async () => {
        renderWelcome();
        expect(hasBeenIntroduced()).toBe(false);

        await press(WELCOME_EN.skip);

        expect(hasBeenIntroduced()).toBe(true);
    });

    /** Going on is not leaving: the introduction is over when the walk through it is, not before. */
    it("leaves the introduction unread while the operator is still walking it", async () => {
        renderWelcome();

        await press(WELCOME_EN.setUp);

        expect(hasBeenIntroduced()).toBe(false);
    });
});
