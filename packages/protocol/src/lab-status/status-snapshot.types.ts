import type { z } from "zod";
import type { StatusSnapshotSchema } from "#src/lab-status/status-snapshot.schema";

export type StatusSnapshot = z.infer<typeof StatusSnapshotSchema>;
