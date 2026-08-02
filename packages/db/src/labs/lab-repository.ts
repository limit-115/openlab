import { transitionLabState } from "@lab/core/lab-lifecycle/lab-state-transitions";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { and, eq } from "drizzle-orm";
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
