import {
    CapabilityRequestType,
    CapabilityStatus
} from "@lab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import { and, eq } from "drizzle-orm";
import type { CreateCapabilityRequestInput } from "#src/capabilities/capability-request-repository.types";
import type { Database } from "#src/lab-database/lab-database-client";
import { capabilityRequests } from "#src/lab-database/lab-schema";

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
                selfProvisioningAttempt: input.selfProvisioningAttempt,
                blocking: input.blocking,
                createdAt: now,
                updatedAt: now
            })
            .returning();
        if (record === undefined) {
            throw new Error(`Failed to create capability request ${input.id}`);
        }
        return toCapabilityRequest(record);
    }

    async answer(requestId: string, answer: string, now = new Date()): Promise<void> {
        if (answer.trim().length === 0) {
            throw new Error("Capability answer must not be empty");
        }
        const [record] = await this.#database
            .update(capabilityRequests)
            .set({
                status: CapabilityStatus.ANSWERED,
                answer,
                answeredAt: now,
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
        ...(record.selfProvisioningAttempt === null
            ? {}
            : { self_provisioning_attempt: record.selfProvisioningAttempt }),
        blocking: record.blocking,
        status: record.status,
        ...(record.answer === null ? {} : { answer: record.answer }),
        ...(record.answeredAt === null ? {} : { answered_at: record.answeredAt.toISOString() }),
        created_at: record.createdAt.toISOString()
    };
}
