import { CapabilityRequestType, CapabilityStatus } from "@lab/protocol/constants";
import type { CapabilityRequest } from "@lab/protocol/schemas";
import { and, eq } from "drizzle-orm";
import type { Database } from "#src/client";
import { capabilityRequests } from "#src/schema";

export interface CreateCapabilityRequestInput {
    readonly id: string;
    readonly labId: string;
    readonly branchId?: string;
    readonly need: string;
    readonly reason: string;
    readonly provisioningHint: string;
    readonly now?: Date;
}

export class CapabilityRepository {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async create(input: CreateCapabilityRequestInput): Promise<CapabilityRequest> {
        const now = input.now ?? new Date();
        const [record] = await this.#database
            .insert(capabilityRequests)
            .values({
                id: input.id,
                labId: input.labId,
                branchId: input.branchId,
                need: input.need,
                reason: input.reason,
                provisioningHint: input.provisioningHint,
                createdAt: now,
                updatedAt: now
            })
            .returning();
        if (record === undefined) {
            throw new Error(`Failed to create capability request ${input.id}`);
        }
        return toCapabilityRequest(record);
    }

    async provide(requestId: string, resourceReference: string, now = new Date()): Promise<void> {
        if (resourceReference.trim().length === 0) {
            throw new Error("Resource reference must not be empty");
        }
        const [record] = await this.#database
            .update(capabilityRequests)
            .set({
                status: CapabilityStatus.PROVIDED,
                resourceReference,
                providedAt: now,
                updatedAt: now
            })
            .where(
                and(
                    eq(capabilityRequests.id, requestId),
                    eq(capabilityRequests.status, CapabilityStatus.OPEN)
                )
            )
            .returning({ id: capabilityRequests.id });
        if (record === undefined) {
            throw new Error(`Capability request ${requestId} is not open`);
        }
    }
}

function toCapabilityRequest(record: typeof capabilityRequests.$inferSelect): CapabilityRequest {
    return {
        id: record.id,
        type: CapabilityRequestType.CAPABILITY_REQUEST,
        need: record.need,
        reason: record.reason,
        provisioning_hint: record.provisioningHint,
        status: record.status,
        created_at: record.createdAt.toISOString()
    };
}
