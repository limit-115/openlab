import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import {
    NotificationChannelKind,
    NotificationLanguage
} from "@lab/protocol/operator-notifications/notification-channel.const";
import { NotificationSettingsViewSchema } from "@lab/protocol/operator-notifications/notification-settings.schema";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
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

function saveButton(): HTMLElement {
    return screen.getByRole("button", { name: OPERATOR_NOTIFICATIONS_EN.save });
}

async function save() {
    await userEvent.click(saveButton());
}

/** The channel folds away, so anything set on it is reached by opening it first. */
async function openChannel() {
    await userEvent.click(
        await screen.findByRole("button", {
            name: new RegExp(OPERATOR_NOTIFICATIONS_EN[NotificationChannelKind.TELEGRAM])
        })
    );
}

/**
 * One of the two fields carrying this label. The lab's own settings open the page and a channel's
 * own sit inside it, and both offer exactly the same choices — that is what disagreeing means — so
 * a query that did not say which of them it meant would answer with either.
 */
async function labField(label: string) {
    const [lab] = await screen.findAllByRole("group", { name: label });
    return within(lab as HTMLElement);
}

async function channelField(label: string) {
    const fields = await screen.findAllByRole("group", { name: label });
    return within(fields[fields.length - 1] as HTMLElement);
}

describe("NotificationSettingsSection", () => {
    it("says a token is stored rather than putting it back on the page", async () => {
        respond();
        renderSection();
        await openChannel();

        const token = await screen.findByLabelText<HTMLInputElement>(
            OPERATOR_NOTIFICATIONS_EN.botToken
        );
        expect(token).toHaveValue("");
        expect(screen.getByText(OPERATOR_NOTIFICATIONS_EN.botTokenStored)).toBeInTheDocument();
    });

    it("names no token when the operator retyped none, so the lab keeps the one it holds", async () => {
        const request = respond();
        renderSection();
        await openChannel();

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

    it("drops a moment the operator unticked out of what the lab reports", async () => {
        const request = respond();
        renderSection();

        const moments = await labField(OPERATOR_NOTIFICATIONS_EN.moments);
        await userEvent.click(
            moments.getByRole("checkbox", {
                name: OPERATOR_NOTIFICATIONS_EN[EventType.INVESTIGATION_HIBERNATED]
            })
        );
        await save();

        const { events } = sentSettings(request).defaults as { events: string[] };
        expect(events).not.toContain(EventType.INVESTIGATION_HIBERNATED);
        expect(events).toContain(EventType.BREAKTHROUGH_RECORDED);
    });

    /** A channel with nothing of its own is the ordinary one, and it must stay that way on save. */
    it("names neither the moments nor the language of a channel that follows the lab", async () => {
        const request = respond();
        renderSection();
        await openChannel();

        await userEvent.type(await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId), "234");
        await save();

        expect(sentChannel(request)).not.toHaveProperty("events");
        expect(sentChannel(request)).not.toHaveProperty("language");
    });

    it("shows what the lab reports for a channel that has not disagreed, rather than a control", async () => {
        respond({
            read: NotificationSettingsViewSchema.parse({
                defaults: { events: [EventType.BREAKTHROUGH_RECORDED] },
                channels: [
                    {
                        kind: NotificationChannelKind.TELEGRAM,
                        enabled: true,
                        chat_id: "-1001",
                        bot_token_set: true
                    }
                ]
            })
        });
        renderSection();
        await openChannel();

        const moments = await channelField(OPERATOR_NOTIFICATIONS_EN.moments);
        expect(
            moments.getByText(OPERATOR_NOTIFICATIONS_EN[EventType.BREAKTHROUGH_RECORDED])
        ).toBeInTheDocument();
        expect(moments.queryAllByRole("checkbox")).toEqual([]);
    });

    it("sends only the question a channel took over, on the answer the operator gave it", async () => {
        const request = respond();
        renderSection();
        await openChannel();

        const language = await channelField(OPERATOR_NOTIFICATIONS_EN.language);
        await userEvent.click(
            language.getByRole("switch", { name: OPERATOR_NOTIFICATIONS_EN.followsLab })
        );
        await userEvent.click(
            language.getByRole("radio", {
                name: OPERATOR_NOTIFICATIONS_EN[NotificationLanguage.RU]
            })
        );
        await save();

        expect(sentChannel(request)).toMatchObject({ language: NotificationLanguage.RU });
        expect(sentChannel(request)).not.toHaveProperty("events");
    });

    it("refuses to send a channel with no bot to write to the chat as", async () => {
        respond({ read: NOTHING_CONFIGURED });
        renderSection();

        await userEvent.type(
            await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId),
            "-1002"
        );

        expect(saveButton()).toBeDisabled();
    });

    /** A control that vanishes once the settings are in leaves the operator hunting for it. */
    it("keeps the save on the page while there is nothing to save, and disables it", async () => {
        respond();
        renderSection();
        await openChannel();

        await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId);

        expect(saveButton()).toBeDisabled();

        await userEvent.type(screen.getByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId), "234");

        expect(saveButton()).toBeEnabled();
    });

    it("shows what the lab stored rather than what was typed into the page", async () => {
        respond({ read: CONFIGURED, written: NOTHING_CONFIGURED });
        renderSection();
        await openChannel();

        await userEvent.type(await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId), "234");
        await save();

        expect(await screen.findByLabelText(OPERATOR_NOTIFICATIONS_EN.chatId)).toHaveValue("");
        expect(screen.getByText(OPERATOR_NOTIFICATIONS_EN.notConfigured)).toBeInTheDocument();
    });

    /** A test that passed on credentials the lab was never given would prove nothing. */
    it("holds the test back while the page is ahead of the lab, and says why", async () => {
        respond();
        renderSection();
        await openChannel();

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
        await openChannel();

        await userEvent.click(
            await screen.findByRole("button", { name: OPERATOR_NOTIFICATIONS_EN.test })
        );

        expect(await screen.findByRole("alert")).toHaveTextContent("Bad Request: chat not found");
    });

    it("says the lab reached the operator when it did", async () => {
        respond({ test: { kind: NotificationChannelKind.TELEGRAM, delivered: true } });
        renderSection();
        await openChannel();

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
