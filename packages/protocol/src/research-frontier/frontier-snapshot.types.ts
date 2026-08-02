import type { z } from "zod";
import type { FrontierSnapshotSchema } from "#src/research-frontier/frontier-snapshot.schema";

export type FrontierSnapshot = z.infer<typeof FrontierSnapshotSchema>;
