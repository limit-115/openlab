import type { z } from "zod";
import type { ProvideCapabilitySchema } from "#src/capabilities/provide-capability.schema";

export type ProvideCapability = z.infer<typeof ProvideCapabilitySchema>;
