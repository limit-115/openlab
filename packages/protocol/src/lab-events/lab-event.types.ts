import type { z } from "zod";
import type { LabEventSchema } from "#src/lab-events/lab-event.schema";

export type LabEvent = z.infer<typeof LabEventSchema>;
