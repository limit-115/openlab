import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import { and, asc, eq } from "drizzle-orm";
import type { BranchRecord, CreateBranchInput } from "#src/branches/branch-repository.types";
import type { Database } from "#src/lab-database/lab-database-client";
import { branches } from "#src/lab-database/lab-schema";

export class BranchRepository {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async create(input: CreateBranchInput): Promise<BranchRecord> {
        const now = input.now ?? new Date();
        const [record] = await this.#database
            .insert(branches)
            .values({
                id: input.id,
                labId: input.labId,
                title: input.title,
                approach: input.approach,
                lane: input.lane,
                isolated: input.isolated ?? true,
                createdAt: now,
                updatedAt: now
            })
            .returning();
        if (record === undefined) {
            throw new Error(`Failed to create branch ${input.id}`);
        }
        return record;
    }

    async listActive(labId: string): Promise<BranchRecord[]> {
        return this.#database
            .select()
            .from(branches)
            .where(and(eq(branches.labId, labId), eq(branches.status, BranchStatus.ACTIVE)))
            .orderBy(asc(branches.createdAt));
    }

    async close(branchId: string, reason: string, now = new Date()): Promise<void> {
        if (reason.trim().length === 0) {
            throw new Error("A branch close reason must not be empty");
        }
        const [record] = await this.#database
            .update(branches)
            .set({ status: BranchStatus.CLOSED, closedReason: reason, updatedAt: now })
            .where(and(eq(branches.id, branchId), eq(branches.status, BranchStatus.ACTIVE)))
            .returning({ id: branches.id });
        if (record === undefined) {
            throw new Error(`Branch ${branchId} is not active`);
        }
    }
}
