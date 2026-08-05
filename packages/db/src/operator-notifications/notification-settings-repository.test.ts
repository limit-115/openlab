import { EventType } from "@nightlab/protocol/investigation-events/event-type.const";
import {
    NotificationChannelKind,
    NotificationLanguage
} from "@nightlab/protocol/operator-notifications/notification-channel.const";
import { NotificationSettingsSchema } from "@nightlab/protocol/operator-notifications/notification-settings.schema";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openTestDatabase, type TestDatabase } from "#src/lab-database/test-database";
import { NotificationSettingsRepository } from "#src/operator-notifications/notification-settings-repository";

describe("NotificationSettingsRepository", () => {
    let database: TestDatabase;
    let repository: NotificationSettingsRepository;

    beforeEach(async () => {
        database = await openTestDatabase();
        repository = new NotificationSettingsRepository(database.db);
    });

    afterEach(async () => {
        await database.close();
    });

    it("reads nothing from a lab that has been told to report to nobody", async () => {
        expect(await repository.read()).toBeUndefined();
    });

    it("hands back the document it stored, credential and chosen moments and all", async () => {
        const settings = NotificationSettingsSchema.parse({
            channels: [
                {
                    kind: NotificationChannelKind.TELEGRAM,
                    enabled: true,
                    events: [EventType.BREAKTHROUGH_RECORDED],
                    language: NotificationLanguage.RU,
                    bot_token: "1234:secret",
                    chat_id: "-1001"
                }
            ]
        });

        await repository.write(settings);

        expect(await repository.read()).toEqual(settings);
    });

    it("keeps one document per lab, so a second write replaces the first", async () => {
        await repository.write(NotificationSettingsSchema.parse({ channels: [] }));

        expect((await repository.read())?.channels).toEqual([]);
    });
});
