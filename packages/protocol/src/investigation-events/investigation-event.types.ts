import type { z } from "zod";
import type { InvestigationEventSchema } from "#src/investigation-events/investigation-event.schema";

export type InvestigationEvent = z.infer<typeof InvestigationEventSchema>;
