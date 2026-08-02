import type { z } from "zod";
import type { ExperimentSchema } from "#src/experiments/experiment.schema";

export type Experiment = z.infer<typeof ExperimentSchema>;
