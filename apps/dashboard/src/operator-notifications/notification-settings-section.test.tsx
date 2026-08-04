import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import { NotificationSettingsViewSchema } from "@lab/protocol/operator-notifications/notification-settings.schema";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { NotificationSettingsSection } from "#src/operator-notifications/notification-settings-section";
import { NotificationEndpoint } from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_EN } from "#src/operator-notifications/operator-notifications.i18n";

const CONFIGURED = NotificationSettingsViewSchema.parse({
    channels: [
        {
            kind: NotificationChannelKind.TELEGRAM,
            enabled: true,
            chat_id: "-1001",
            bot_token_set: true
        }
    ]
});

const NOTHING_CONFIGURED = NotificationSettingsViewSchema.parse({ channels: [] });

interface LabAnswers {
    read?: unknown;
    readStatus?: number;
    written?: unknown;
    test?: unknown;
}

/** Answers the read with what the lab holds, the write with what it decides to store, and a test. */
function respond({ read = CONFIGURED, readStatus = 200, written = read, test }: LabAnswers = {}) {
    const request = vi.fn((url: string, init?: RequestInit) => {
        if (url === NotificationEndpoint.TEST) {
            return Promise.resolve(
                new Response(JSON.stringify(test), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                })
            );
        }
        const writing = init?.method === "PUT";
        return Promise.resolve(
            new Response(JSON.stringify(writing ? written : read), {
                status: writing ? 200 : readStatus,
                headers: { "Content-Type": "application/json" }
            })
        );
    });
    vi.stubGlobal("fetch", request);
    return request;
}

function renderSection() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<NotificationSettingsSection />, {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        )
    });
}

function sentSettings(request: ReturnType<typeof respond>): Record<string, unknown> {
    const write = request.mock.calls.find(([, init]) => init?.method === "PUT");
    if (write === undefined) {
        throw new Error("The section never wrote the settings");
    }
    return JSON.parse(String(write[1]?.body));
}

function sentChannel(request: ReturnType<typeof respond>): Record<string, unknown> {
    const [channel] = sentSettings(request).channels as Record<string, unknown>[];
    if (channel === undefined) {
        throw new Error("The section wrote no channel");
    }
    return channel;
}

async function save() {
    await userEvent.click(screen.getByRole("button", { name: OPERATOR_NOTIFICATIONS_EN.save }));
}

describe("NotificationSettingsSection", () => {
    it("says a token is stored rather than putting it back on the page", async () => {
        respond();
        renderSection();

        const token = await screen.findByLabelText<HTMLInputElement>(
            OPERATOR_NOTIFICATIONS_EN.botToken
        );
        expect(token).toHaveValue("");
        expect(screen.getByText(OPERATOR_NOTIFICATIONS_EN.botTokenStored)).toBeInTheDocument();
    });

    it("names no token when the operator retyped none, so the lab keeps the one it holds", async () => {
        const request = respond();
        renderSection();

        await userEvent.type(await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId), "234");
        await save();

        const channel = sentChannel(request);
        expect(channel).not.toHaveProperty("bot_token");
        expect(channel.chat_id).toBe("-1001234");
    });

    it("sends the credentials an operator set up a channel with from nothing", async () => {
        const request = respond({ read: NOTHING_CONFIGURED });
        renderSection();

        await userEvent.type(
            await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.botToken),
            "5678:new"
        );
        await userEvent.type(screen.getByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId), "-1002");
        await save();

        expect(sentChannel(request)).toMatchObject({
            kind: NotificationChannelKind.TELEGRAM,
            bot_token: "5678:new",
            chat_id: "-1002"
        });
    });

    it("drops a moment the operator unticked out of what it sends", async () => {
        const request = respond();
        renderSection();

        await userEvent.click(
            await screen.findByRole("checkbox", {
                name: OPERATOR_NOTIFICATIONS_EN[EventType.INVESTIGATION_HIBERNATED]
            })
        );
        await save();

        expect(sentChannel(request).events).not.toContain(EventType.INVESTIGATION_HIBERNATED);
        expect(sentChannel(request).events).toContain(EventType.BREAKTHROUGH_RECORDED);
    });

    it("refuses to send a channel with no bot to write to the chat as", async () => {
        respond({ read: NOTHING_CONFIGURED });
        renderSection();

        await userEvent.type(
            await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId),
            "-1002"
        );

        expect(screen.getByRole("button", { name: OPERATOR_NOTIFICATIONS_EN.save })).toBeDisabled();
    });

    it("offers no save while the page holds exactly what the lab is reporting by", async () => {
        respond();
        renderSection();

        await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId);

        expect(
            screen.queryByRole("button", { name: OPERATOR_NOTIFICATIONS_EN.save })
        ).not.toBeInTheDocument();
    });

    it("shows what the lab stored rather than what was typed into the page", async () => {
        respond({ read: CONFIGURED, written: NOTHING_CONFIGURED });
        renderSection();

        await userEvent.type(await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId), "234");
        await save();

        expect(await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId)).toHaveValue("");
        expect(screen.getByText(OPERATOR_NOTIFICATIONS_EN.notConfigured)).toBeInTheDocument();
    });

    /** A test that passed on credentials the lab was never given would prove nothing. */
    it("holds the test back while the page is ahead of the lab, and says why", async () => {
        respond();
        renderSection();

        await userEvent.type(await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId), "234");

        expect(screen.getByRole("button", { name: OPERATOR_NOTIFICATIONS_EN.test })).toBeDisabled();
        expect(screen.getByText(OPERATOR_NOTIFICATIONS_EN.testNeedsSaving)).toBeInTheDocument();
    });

    it("hands the vendor's refusal on to the operator, which names the field to fix", async () => {
        respond({
            test: {
                kind: NotificationChannelKind.TELEGRAM,
                delivered: false,
                reason: "Bad Request: chat not found"
            }
        });
        renderSection();

        await userEvent.click(
            await screen.findByRole("button", { name: OPERATOR_NOTIFICATIONS_EN.test })
        );

        expect(await screen.findByRole("alert")).toHaveTextContent("Bad Request: chat not found");
    });

    it("says the lab reached the operator when it did", async () => {
        respond({ test: { kind: NotificationChannelKind.TELEGRAM, delivered: true } });
        renderSection();

        await userEvent.click(
            await screen.findByRole("button", { name: OPERATOR_NOTIFICATIONS_EN.test })
        );

        expect(
            await screen.findByText(OPERATOR_NOTIFICATIONS_EN.testDelivered)
        ).toBeInTheDocument();
    });

    it("says why there is nothing to set when the runtime does not serve them", async () => {
        respond({ read: { error: "Not found" }, readStatus: 404 });
        renderSection();

        expect(
            await screen.findByText(OPERATOR_NOTIFICATIONS_EN.unsupportedTitle)
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: OPERATOR_NOTIFICATIONS_EN.test })
        ).not.toBeInTheDocument();
    });
});
