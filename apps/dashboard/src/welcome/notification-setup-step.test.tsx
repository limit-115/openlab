import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import { DEFAULT_NOTIFIED_EVENTS } from "@lab/protocol/operator-notifications/notification-settings.const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OPERATOR_NOTIFICATIONS_EN } from "#src/operator-notifications/operator-notifications.i18n";
import { NotificationSetupStep } from "#src/welcome/notification-setup-step";
import { WELCOME_EN } from "#src/welcome/welcome.i18n";

const REPORTING = { events: [...DEFAULT_NOTIFIED_EVENTS], language: "en" };

const NOBODY = { defaults: REPORTING, channels: [] };

/** A lab that already has somewhere to write, which is what a save leaves behind. */
const A_CHAT = {
    defaults: REPORTING,
    channels: [
        {
            kind: NotificationChannelKind.TELEGRAM,
            enabled: true,
            chat_id: "-1001234",
            answers_back: true,
            bot_token_set: true
        }
    ]
};

function openStep(stored: unknown = NOBODY) {
    const answered = vi.fn((_url: string, _request?: RequestInit) =>
        Promise.resolve(new Response(JSON.stringify(stored), { status: 200 }))
    );
    vi.stubGlobal("fetch", answered);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
        <MemoryRouter>
            <QueryClientProvider client={client}>
                <NotificationSetupStep />
            </QueryClientProvider>
        </MemoryRouter>
    );

    return answered;
}

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("NotificationSetupStep", () => {
    /**
     * Filling a channel in during the setup is asking for it to work. The settings page keeps the
     * switch for turning it off later, but a channel saved here and silent would be the lab quietly
     * not doing the one thing this step was for.
     */
    it("hands the lab a channel that is switched on", async () => {
        const answered = openStep();
        const operator = userEvent.setup();

        await operator.type(
            await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.botToken),
            "123456789:AA"
        );
        await operator.type(screen.getByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId), "-1001234");
        await operator.click(screen.getByRole("button", { name: OPERATOR_NOTIFICATIONS_EN.save }));

        const written = answered.mock.calls.find(([, request]) => request?.method === "PUT");
        expect(JSON.parse(String(written?.[1]?.body)).channels).toEqual([
            {
                kind: NotificationChannelKind.TELEGRAM,
                enabled: true,
                chat_id: "-1001234",
                answers_back: true,
                bot_token: "123456789:AA"
            }
        ]);
    });

    /**
     * This is the one step of the introduction that can be left undone without consequence, and the
     * button says which of the two it is doing. A "Continue" that quietly left the lab unable to
     * reach anybody would be the setup claiming work it did not do.
     */
    it("offers to skip while the lab still has nowhere to write", async () => {
        openStep();

        expect(
            await screen.findByRole("button", { name: WELCOME_EN.skipStep })
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: WELCOME_EN.continue })).not.toBeInTheDocument();
    });

    it("goes on rather than skips once the lab is holding a channel", async () => {
        openStep(A_CHAT);

        expect(
            await screen.findByRole("button", { name: WELCOME_EN.continue })
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: WELCOME_EN.skipStep })).not.toBeInTheDocument();
    });
});
