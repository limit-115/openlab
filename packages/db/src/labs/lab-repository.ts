import { transitionLabState } from "@lab/core/lab-lifecycle/lab-state-transitions";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { and, eq, ne } from "drizzle-orm";
import type { Database } from "#src/lab-database/lab-database-client";
import { labs } from "#src/lab-database/lab-schema";
import type {
    CreateLabInput,
    LabRecord,
    PersistLifecycleInput
} from "#src/labs/lab-repository.types";

export class LabRepository {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async create(input: CreateLabInput): Promise<LabRecord> {
        const now = input.now ?? new Date();
        const [record] = await this.#database
            .insert(labs)
            .values({
                id: input.id,
                goal: input.input.goal,
                input: input.input,
                workspacePath: input.workspacePath,
                startedAt: now,
                createdAt: now,
                updatedAt: now
            })
            .returning();
        if (record === undefined) {
            throw new Error(`Failed to create lab ${input.id}`);
        }
        return record;
    }

    async find(labId: string): Promise<LabRecord | undefined> {
        return this.#database.query.labs.findFirst({ where: eq(labs.id, labId) });
    }

    async listIds(): Promise<string[]> {
        const rows = await this.#database.select({ id: labs.id }).from(labs);
        return rows.map((row) => row.id);
    }

    /**
     * Deletes lab rows and, through the schema cascade, every branch, task, attempt, claim,
     * evidence, event, checkpoint, and capability request that hangs off them. Passing a lab id
     * spares that one run. Returns the deleted lab ids.
     */
    async purge(keptLabId?: string): Promise<string[]> {
        const rows = await this.#database
            .delete(labs)
            .where(keptLabId === undefined ? undefined : ne(labs.id, keptLabId))
            .returning({ id: labs.id });
        return rows.map((row) => row.id);
    }

    async persistLifecycle(input: PersistLifecycleInput): Promise<LabRecord> {
        const now = input.now ?? new Date();
        transitionLabState(input.expectedState, input.state, input.context);
        const [record] = await this.#database
            .update(labs)
            .set({
                state: input.state,
                stateReason: input.reason ?? null,
                updatedAt: now,
                ...(input.state === LabState.HIBERNATING ? { hibernatedAt: now } : {}),
                ...(input.state === LabState.COMPLETED ? { completedAt: now } : {}),
                ...(input.state === LabState.STOPPED ? { stoppedAt: now } : {})
            })
            .where(and(eq(labs.id, input.labId), eq(labs.state, input.expectedState)))
            .returning();
        if (record === undefined) {
            throw new Error(`Lab ${input.labId} was not in expected state ${input.expectedState}`);
        }
        return record;
    }
}
