import type { z } from "zod";
import type { CapabilityRequestSchema } from "#src/capabilities/capability-request.schema";

export type CapabilityRequest = z.infer<typeof CapabilityRequestSchema>;
