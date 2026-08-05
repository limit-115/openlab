import { EventType } from "@nightlab/protocol/investigation-events/event-type.const";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InvestigationRepository } from "#src/investigations/investigation-repository";
import {
    agentRuns,
    assumptions,
    capabilityRequests,
    events,
    findings,
    runtimeCheckpoints
} from "#src/lab-database/lab-schema";
import { openTestDatabase, type TestDatabase } from "#src/lab-database/test-database";
import { RuntimePersistence } from "#src/runtime/runtime-persistence";
import {
    makeEvent,
    makeInput,
    makeSnapshot,
    testInvestigationId
} from "#src/runtime/runtime-snapshot.fixture";

describe("InvestigationRepository", () => {
    let database: TestDatabase;
    let persistence: RuntimePersistence;
    let repository: InvestigationRepository;

    beforeEach(async () => {
        database = await openTestDatabase();
        persistence = new RuntimePersistence(database);
        repository = new InvestigationRepository(database.db);
    });

    afterEach(async () => {
        await database.close();
    });

    /** An investigation with everything that hangs off it: bets, runs, findings, requests, events. */
    async function open(name: string): Promise<string> {
        const input = makeInput();
        const snapshot = makeSnapshot(testInvestigationId(name), input);
        await persistence.initialize({
            task: input,
            workspacePath: `/tmp/lab-${name}`,
            snapshot,
            event: makeEvent(
                EventType.INVESTIGATION_STARTED,
                snapshot.investigation.id,
                `event-${name}`
            )
        });
        return snapshot.investigation.id;
    }

    async function history(): Promise<Record<string, number>> {
        const [bets, runs, claims, requests, log, checkpoints] = await Promise.all([
            database.db.select().from(assumptions),
            database.db.select().from(agentRuns),
            database.db.select().from(findings),
            database.db.select().from(capabilityRequests),
            database.db.select().from(events),
            database.db.select().from(runtimeCheckpoints)
        ]);
        return {
            assumptions: bets.length,
            runs: runs.length,
            findings: claims.length,
            capabilityRequests: requests.length,
            events: log.length,
            checkpoints: checkpoints.length
        };
    }

    it("takes an investigation's whole history with it when it is discarded", async () => {
        const investigationId = await open("discarded");
        expect(Object.values(await history())).not.toContain(0);

        expect(await repository.delete(investigationId)).toBe(true);

        expect(await history()).toEqual({
            assumptions: 0,
            runs: 0,
            findings: 0,
            capabilityRequests: 0,
            events: 0,
            checkpoints: 0
        });
    });

    it("reports an identifier it never held as nothing to discard", async () => {
        await open("held");

        expect(await repository.delete("investigation-never-opened")).toBe(false);
        expect(await repository.listIds()).toHaveLength(1);
    });

    it("empties the lab except for the investigation it was told to keep", async () => {
        const kept = await open("kept");
        const emptied = await open("emptied");

        expect(await repository.purge(kept)).toEqual([emptied]);

        expect(await repository.listIds()).toEqual([kept]);
        expect(await history()).toEqual({
            assumptions: 1,
            runs: 3,
            findings: 1,
            capabilityRequests: 1,
            events: 1,
            checkpoints: 1
        });
    });
});
