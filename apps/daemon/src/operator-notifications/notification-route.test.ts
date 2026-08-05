import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { NotificationChannel } from "@nightlab/notifier/notification-channel.types";
import { NotificationDeliveryError } from "@nightlab/notifier/notification-delivery-error";
import { NotificationDeliveryFailure } from "@nightlab/notifier/notification-delivery-error.const";
import { EventType } from "@nightlab/protocol/investigation-events/event-type.const";
import {
    NotificationChannelKind,
    NotificationLanguage
} from "@nightlab/protocol/operator-notifications/notification-channel.const";
import { NotificationSettingsSchema } from "@nightlab/protocol/operator-notifications/notification-settings.schema";
import { NotificationTestResultSchema } from "@nightlab/protocol/operator-notifications/notification-test.schema";
import { describe, expect, it, vi } from "vitest";
import { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import { InMemoryRuntime } from "#src/investigation-registry/investigation-runtime.fixture";
import { createStatusServer } from "#src/investigation-status/status-server";
import { NotificationDispatch } from "#src/operator-notifications/notification-dispatch";
import { InMemoryNotificationSettings } from "#src/operator-notifications/notification-settings.fixture";
import { NotificationSettingsStore } from "#src/operator-notifications/notification-settings-store";
import { NotificationRoute } from "#src/operator-notifications/operator-notifications.const";
import { ResearchLoopOutcomeStatus } from "#src/research-cycle/research-loop.const";
import type { ResearchLoopOutcome } from "#src/research-cycle/research-loop.types";

const BOT_TOKEN = "1234:secret";

const CONFIGURED = NotificationSettingsSchema.parse({
    channels: [
        {
            kind: NotificationChannelKind.TELEGRAM,
            enabled: true,
            bot_token: BOT_TOKEN,
            chat_id: "-1001"
        }
    ]
});

async function createTestLab(stored = CONFIGURED, refusal?: string) {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-notify-test-"));
    const runtime = new InMemoryRuntime();
    const registry = new InvestigationRegistry({
        workspaceRoot,
        persistence: runtime,
        investigations: runtime,
        researchLoop: async (): Promise<ResearchLoopOutcome> => ({
            status: ResearchLoopOutcomeStatus.CANCELLED
        })
    });
    const settings = new NotificationSettingsStore(new InMemoryNotificationSettings(stored));
    await settings.load();
    const open = vi.fn(
        (): NotificationChannel => ({
            kind: NotificationChannelKind.TELEGRAM,
            deliver: async () => {
                if (refusal !== undefined) {
                    throw new NotificationDeliveryError(
                        NotificationChannelKind.TELEGRAM,
                        NotificationDeliveryFailure.REFUSED,
                        refusal
                    );
                }
                return {};
            }
        })
    );
    const dispatch = new NotificationDispatch({
        settings,
        labUrl: () => "http://127.0.0.1:4318",
        open
    });
    return {
        settings,
        server: createStatusServer(registry, { notifications: { settings, dispatch } })
    };
}

describe("notification settings route", () => {
    it("serves the chat and the moments, and never the token the bot authenticates with", async () => {
        const lab = await createTestLab();

        const response = await lab.server.inject({
            method: "GET",
            url: NotificationRoute.SETTINGS
        });

        expect(response.statusCode).toBe(200);
        expect(response.body).not.toContain(BOT_TOKEN);
        expect(response.json().channels[0]).toMatchObject({
            kind: NotificationChannelKind.TELEGRAM,
            chat_id: "-1001",
            bot_token_set: true
        });
        await lab.server.close();
    });

    it("keeps the stored token when the operator changes a channel without retyping it", async () => {
        const lab = await createTestLab();

        const response = await lab.server.inject({
            method: "PUT",
            url: NotificationRoute.SETTINGS,
            payload: {
                channels: [
                    {
                        kind: NotificationChannelKind.TELEGRAM,
                        enabled: true,
                        chat_id: "-1002",
                        language: NotificationLanguage.RU,
                        events: [EventType.BREAKTHROUGH_RECORDED]
                    }
                ]
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.body).not.toContain(BOT_TOKEN);
        expect(lab.settings.read().channels[0]).toMatchObject({
            bot_token: BOT_TOKEN,
            chat_id: "-1002",
            language: NotificationLanguage.RU
        });
        await lab.server.close();
    });

    it("refuses settings naming a moment the lab never reports, and keeps the ones in force", async () => {
        const lab = await createTestLab();

        const response = await lab.server.inject({
            method: "PUT",
            url: NotificationRoute.SETTINGS,
            payload: {
                channels: [
                    {
                        kind: NotificationChannelKind.TELEGRAM,
                        enabled: true,
                        chat_id: "-1001",
                        events: [EventType.RUN_STARTED]
                    }
                ]
            }
        });

        expect(response.statusCode).toBe(400);
        expect(lab.settings.read().channels[0]?.chat_id).toBe("-1001");
        await lab.server.close();
    });
});

describe("notification test route", () => {
    it("reports that the lab reached the operator", async () => {
        const lab = await createTestLab();

        const response = await lab.server.inject({
            method: "POST",
            url: NotificationRoute.TEST,
            payload: { kind: NotificationChannelKind.TELEGRAM }
        });

        expect(NotificationTestResultSchema.parse(response.json())).toEqual({
            kind: NotificationChannelKind.TELEGRAM,
            delivered: true
        });
        await lab.server.close();
    });

    it("hands the vendor's own refusal through rather than a status nobody can act on", async () => {
        const lab = await createTestLab(CONFIGURED, "Bad Request: chat not found");

        const response = await lab.server.inject({
            method: "POST",
            url: NotificationRoute.TEST,
            payload: { kind: NotificationChannelKind.TELEGRAM }
        });

        expect(response.statusCode).toBe(200);
        expect(NotificationTestResultSchema.parse(response.json())).toEqual({
            kind: NotificationChannelKind.TELEGRAM,
            delivered: false,
            reason: "Bad Request: chat not found"
        });
        await lab.server.close();
    });

    it("has nothing to try for a channel the lab holds no credentials for", async () => {
        const lab = await createTestLab(NotificationSettingsSchema.parse({ channels: [] }));

        const response = await lab.server.inject({
            method: "POST",
            url: NotificationRoute.TEST,
            payload: { kind: NotificationChannelKind.TELEGRAM }
        });

        expect(response.statusCode).toBe(404);
        await lab.server.close();
    });
});

describe("a runtime serving no notification settings", () => {
    it("answers nothing on the address, so a dashboard can tell it apart from a silent lab", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-notify-off-"));
        const runtime = new InMemoryRuntime();
        const server = createStatusServer(
            new InvestigationRegistry({
                workspaceRoot,
                persistence: runtime,
                investigations: runtime
            })
        );

        const response = await server.inject({ method: "GET", url: NotificationRoute.SETTINGS });

        expect(response.statusCode).toBe(404);
        await server.close();
    });
});
