import { AgentEffortLevel, AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { LabSettingsSchema } from "@lab/protocol/lab-settings/lab-settings.schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseClient } from "#src/lab-database/lab-database-client";
import { migrateDatabase } from "#src/lab-database/lab-schema-migration";
import { LabSettingsRepository } from "#src/lab-settings/lab-settings-repository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

describeDatabase("LabSettingsRepository PostgreSQL 18 integration", () => {
    let client: DatabaseClient;
    let repository: LabSettingsRepository;

    beforeAll(async () => {
        if (databaseUrl === undefined) {
            return;
        }
        client = createDatabase(databaseUrl, { max: 2 });
        await migrateDatabase(client.db);
        repository = new LabSettingsRepository(client.db);
    });

    afterAll(async () => {
        await client?.close();
    });

    it("reads nothing from a lab nobody has configured", async () => {
        expect(await repository.read()).toBeUndefined();
    });

    it("hands back the document it stored, models and roster order and all", async () => {
        const settings = LabSettingsSchema.parse({
            harness_roster: [AgentHarnessKind.GLM, AgentHarnessKind.CODEX],
            role_execution: [
                {
                    role: AgentRole.DIRECTOR,
                    effort: AgentEffortLevel.MAX,
                    models: [{ harness: AgentHarnessKind.CODEX, model: "gpt-5.6-sol" }]
                }
            ]
        });

        await repository.write(settings);

        expect(await repository.read()).toEqual(settings);
    });

    it("keeps one document per lab, so a second write replaces the first", async () => {
        await repository.write(
            LabSettingsSchema.parse({ harness_roster: [AgentHarnessKind.CLAUDE] })
        );
        await repository.write(
            LabSettingsSchema.parse({ harness_roster: [AgentHarnessKind.CODEX] })
        );

        expect((await repository.read())?.harness_roster).toEqual([AgentHarnessKind.CODEX]);
    });
});
