import { transitionInvestigationState } from "@lab/core/investigation-lifecycle/investigation-state-transitions";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { and, eq, ne } from "drizzle-orm";
import type {
    CreateInvestigationInput,
    InvestigationRecord,
    PersistLifecycleInput
} from "#src/investigations/investigation-repository.types";
import type { Database } from "#src/lab-database/lab-database-client";
import { investigations } from "#src/lab-database/lab-schema";

export class InvestigationRepository {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async create(input: CreateInvestigationInput): Promise<InvestigationRecord> {
        const now = input.now ?? new Date();
        const [record] = await this.#database
            .insert(investigations)
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
            throw new Error(`Failed to create investigation ${input.id}`);
        }
        return record;
    }

    async find(investigationId: string): Promise<InvestigationRecord | undefined> {
        return this.#database.query.investigations.findFirst({
            where: eq(investigations.id, investigationId)
        });
    }

    async listIds(): Promise<string[]> {
        const rows = await this.#database.select({ id: investigations.id }).from(investigations);
        return rows.map((row) => row.id);
    }

    /**
     * Deletes one investigation and, through the schema cascade, everything that hangs off it.
     * Reports whether there was a row to delete, which is how a caller tells a stale identifier
     * from a run it has just discarded.
     */
    async delete(investigationId: string): Promise<boolean> {
        const rows = await this.#database
            .delete(investigations)
            .where(eq(investigations.id, investigationId))
            .returning({ id: investigations.id });
        return rows.length > 0;
    }

    /**
     * Deletes investigation rows and, through the schema cascade, every assumption, agent run, finding,
     * verdict, event, checkpoint, and capability request that hangs off them. Passing an investigation id
     * spares that one run. Returns the deleted investigation ids.
     */
    async purge(keptInvestigationId?: string): Promise<string[]> {
        const rows = await this.#database
            .delete(investigations)
            .where(
                keptInvestigationId === undefined
                    ? undefined
                    : ne(investigations.id, keptInvestigationId)
            )
            .returning({ id: investigations.id });
        return rows.map((row) => row.id);
    }

    async persistLifecycle(input: PersistLifecycleInput): Promise<InvestigationRecord> {
        const now = input.now ?? new Date();
        transitionInvestigationState(input.expectedState, input.state, input.context);
        const [record] = await this.#database
            .update(investigations)
            .set({
                state: input.state,
                stateReason: input.reason ?? null,
                updatedAt: now,
                ...(input.state === InvestigationState.HIBERNATING ? { hibernatedAt: now } : {}),
                ...(input.state === InvestigationState.BREAKTHROUGH ? { breakthroughAt: now } : {}),
                ...(input.state === InvestigationState.STOPPED ? { stoppedAt: now } : {})
            })
            .where(
                and(
                    eq(investigations.id, input.investigationId),
                    eq(investigations.state, input.expectedState)
                )
            )
            .returning();
        if (record === undefined) {
            throw new Error(
                `Investigation ${input.investigationId} was not in expected state ${input.expectedState}`
            );
        }
        return record;
    }
}
