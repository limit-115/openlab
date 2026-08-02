import { z } from "zod";
import { CapabilityResourceReferenceSchema } from "#src/capabilities/capability-resource-reference.schema";

export const ProvideCapabilitySchema = z.object({
    resource_reference: CapabilityResourceReferenceSchema
});
