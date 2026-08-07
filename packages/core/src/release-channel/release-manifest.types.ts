import type { z } from "zod";
import type {
    ReleaseArtifactSchema,
    ReleaseManifestSchema
} from "#src/release-channel/release-manifest.schema";

export type ReleaseArtifact = z.infer<typeof ReleaseArtifactSchema>;

export type ReleaseManifest = z.infer<typeof ReleaseManifestSchema>;
