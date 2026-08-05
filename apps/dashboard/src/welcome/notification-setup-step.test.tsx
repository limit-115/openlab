import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import { DEFAULT_NOTIFIED_EVENTS } from "@lab/protocol/operator-notifications/notification-settings.const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OPERATOR_NOTIFICATIONS_EN } from "#src/operator-notifications/operator-notifications.i18n";
import { NotificationSetupStep } from "#src/welcome/notification-setup-step";

const NOBODY = {
    defaults: { events: [...DEFAULT_NOTIFIED_EVENTS], language: "en" },
    channels: []
};

function openStep() {
    /** The lab is reporting to nobody, and answers a save with what it now holds. */
    const answered = vi.fn((_url: string, _request?: RequestInit) =>
        Promise.resolve(new Response(JSON.stringify(NOBODY), { status: 200 }))
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
});
