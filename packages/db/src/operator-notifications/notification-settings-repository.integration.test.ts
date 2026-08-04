import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import {
    NotificationChannelKind,
    NotificationLanguage
} from "@lab/protocol/operator-notifications/notification-channel.const";
import { NotificationSettingsSchema } from "@lab/protocol/operator-notifications/notification-settings.schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseClient } from "#src/lab-database/lab-database-client";
import { migrateDatabase } from "#src/lab-database/lab-schema-migration";
import { NotificationSettingsRepository } from "#src/operator-notifications/notification-settings-repository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

describeDatabase("NotificationSettingsRepository PostgreSQL 18 integration", () => {
    let client: DatabaseClient;
    let repository: NotificationSettingsRepository;

    beforeAll(async () => {
        if (databaseUrl === undefined) {
            return;
        }
        client = createDatabase(databaseUrl, { max: 2 });
        await migrateDatabase(client.db);
        repository = new NotificationSettingsRepository(client.db);
    });

    afterAll(async () => {
        await client?.close();
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
