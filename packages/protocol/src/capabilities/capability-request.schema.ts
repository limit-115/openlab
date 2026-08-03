import { z } from "zod";
import {
    CapabilityRequestType,
    CapabilityStatus
} from "#src/capabilities/capability-request.const";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";

export const CapabilityRequestSchema = z
    .object({
        id: IdentifierSchema,
        type: z.literal(CapabilityRequestType.CAPABILITY_REQUEST),
        need: z.string().trim().min(1),
        reason: z.string().trim().min(1),
        provisioning_hint: z.string().trim().min(1),
        /** Absent on a request the daemon raised itself, which attempted no provisioning at all. */
        self_provisioning_attempt: z.string().trim().min(1).optional(),
        blocking: z.boolean().default(false),
        status: z.enum(CapabilityStatus).default(CapabilityStatus.OPEN),
        answer: z.string().trim().min(1).optional(),
        answered_at: z.iso.datetime().optional(),
        created_at: z.iso.datetime()
    })
    .refine(
        (request) =>
            request.status !== CapabilityStatus.ANSWERED ||
            (request.answer !== undefined && request.answered_at !== undefined),
        {
            error: "An answered capability request requires the operator answer and its timestamp"
        }
    );
