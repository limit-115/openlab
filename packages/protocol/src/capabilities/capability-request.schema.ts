import { z } from "zod";
import {
    CapabilityRequestType,
    CapabilityResourceClass,
    CapabilityStatus
} from "#src/capabilities/capability-request.const";
import { CapabilityResourceReferenceSchema } from "#src/capabilities/capability-resource-reference.schema";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";

export const CapabilityRequestSchema = z
    .object({
        id: IdentifierSchema,
        type: z.literal(CapabilityRequestType.CAPABILITY_REQUEST),
        need: z.string().trim().min(1),
        resource_class: z.enum(CapabilityResourceClass),
        reason: z.string().trim().min(1),
        provisioning_hint: z.string().trim().min(1),
        status: z.enum(CapabilityStatus).default(CapabilityStatus.OPEN),
        resource_reference: CapabilityResourceReferenceSchema.optional(),
        provided_at: z.iso.datetime().optional(),
        created_at: z.iso.datetime()
    })
    .refine(
        (request) =>
            request.status !== CapabilityStatus.PROVIDED ||
            (request.resource_reference !== undefined && request.provided_at !== undefined),
        {
            error: "A provided capability requires its resource reference and timestamp"
        }
    );
