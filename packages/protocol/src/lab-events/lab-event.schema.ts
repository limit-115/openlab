import { z } from "zod";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";
import { EventType } from "#src/lab-events/event-type.const";

export const LabEventSchema = z.object({
    id: IdentifierSchema,
    lab_id: IdentifierSchema,
    type: z.enum(EventType),
    occurred_at: z.iso.datetime(),
    payload: z.record(z.string(), z.unknown())
});
