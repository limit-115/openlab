import { AgentEffortLevel, AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { AgentRole } from "@openlab/protocol/agents/agent-role.const";
import { LabSettingsSchema } from "@openlab/protocol/lab-settings/lab-settings.schema";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openTestDatabase, type TestDatabase } from "#src/lab-database/test-database";
import { LabSettingsRepository } from "#src/lab-settings/lab-settings-repository";

describe("LabSettingsRepository", () => {
    let database: TestDatabase;
    let repository: LabSettingsRepository;

    beforeEach(async () => {
        database = await openTestDatabase();
        repository = new LabSettingsRepository(database.db);
    });

    afterEach(async () => {
        await database.close();
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
