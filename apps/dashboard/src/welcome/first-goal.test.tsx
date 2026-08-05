import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INVESTIGATION_ROSTER_EN } from "#src/investigation-roster/investigation-roster.i18n";
import { FirstGoal } from "#src/welcome/first-goal";
import { WELCOME_EN } from "#src/welcome/welcome.i18n";

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function openStep() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <MemoryRouter>
            <QueryClientProvider client={client}>
                <FirstGoal />
            </QueryClientProvider>
        </MemoryRouter>
    );
}

function goalBox() {
    return screen.getByLabelText<HTMLTextAreaElement>(INVESTIGATION_ROSTER_EN.goalLabel);
}

function startButton() {
    return screen.getByRole("button", { name: WELCOME_EN.goalStart });
}

describe("FirstGoal", () => {
    /** A blank box after four screens of explanation is where a setup gets abandoned. */
    it("hands the operator a goal to start from rather than an empty box", async () => {
        openStep();
        expect(startButton()).toBeDisabled();

        await userEvent
            .setup()
            .click(screen.getByRole("button", { name: WELCOME_EN.goalExampleSorting }));

        expect(goalBox().value).toBe(WELCOME_EN.goalExampleSorting);
        expect(startButton()).toBeEnabled();
    });

    /** The lab is handed the goal and nothing else: every other answer is one it already holds. */
    it("starts the investigation on the goal the operator wrote", async () => {
        const dispatched = vi.fn((_url: string, _request?: RequestInit) =>
            Promise.resolve(
                new Response(JSON.stringify({ investigation: { id: "investigation-1" } }), {
                    status: 201
                })
            )
        );
        vi.stubGlobal("fetch", dispatched);
        openStep();

        const operator = userEvent.setup();
        await operator.type(goalBox(), "Find a shorter proof");
        await operator.click(startButton());

        const started = dispatched.mock.calls.find(([, request]) => request?.method === "POST");
        expect(JSON.parse(String(started?.[1]?.body))).toEqual({ goal: "Find a shorter proof" });
    });
});
