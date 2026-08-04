import { z } from "zod";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { EventType } from "#src/investigation-events/event-type.const";

export const InvestigationEventSchema = z.object({
    id: IdentifierSchema,
    investigation_id: IdentifierSchema,
    type: z.enum(EventType),
    occurred_at: z.iso.datetime(),
    payload: z.record(z.string(), z.unknown())
});
