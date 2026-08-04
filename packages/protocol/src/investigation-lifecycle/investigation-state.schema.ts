import { z } from "zod";
import { InvestigationState } from "#src/investigation-lifecycle/investigation-state.const";

export const InvestigationStateSchema = z.enum(InvestigationState);
