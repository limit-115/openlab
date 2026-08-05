import type { z } from "zod";
import type { InvestigationDispatchSchema } from "#src/investigation-input/investigation-dispatch.schema";

export type InvestigationDispatch = z.infer<typeof InvestigationDispatchSchema>;
