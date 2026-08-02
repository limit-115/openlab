import { type LifecycleContext, transitionLabState } from "@lab/core/lifecycle";
import { LabState, type LabState as LabStateValue } from "@lab/protocol/constants";
import type { TaskInput } from "@lab/protocol/schemas";
import { and, eq } from "drizzle-orm";
import type { Database } from "#src/client";
import { labs } from "#src/schema";

export type LabRecord = typeof labs.$inferSelect;

export interface CreateLabInput {
    readonly id: string;
    readonly input: TaskInput;
    readonly workspacePath: string;
    readonly now?: Date;
}

export interface PersistLifecycleInput {
    readonly labId: string;
    readonly expectedState: LabStateValue;
    readonly state: LabStateValue;
    readonly context?: LifecycleContext;
    readonly reason?: string;
    readonly now?: Date;
}

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
