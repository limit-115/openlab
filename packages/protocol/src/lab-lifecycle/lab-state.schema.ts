import { z } from "zod";
import { LabState } from "#src/lab-lifecycle/lab-state.const";

export const LabStateSchema = z.enum(LabState);
