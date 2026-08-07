import writeFileAtomic from "write-file-atomic";
import { HarnessRunStatuses } from "#src/agent-harness/agent-harness.const";
import type { HarnessArtifact } from "#src/agent-harness/agent-harness.types";
import { hashArtifact } from "#src/cli-agent-harness/harness-run-artifacts";
import { HARNESS_ARTIFACT_FILE_MODE } from "#src/cli-agent-harness/harness-run-artifacts.const";
import { HARNESS_MANIFEST_SCHEMA_VERSION } from "#src/cli-agent-harness/harness-run-manifest.const";
import type {
    FinishedRunManifest,
    StartedRunManifest
} from "#src/cli-agent-harness/harness-run-manifest.types";

export async function writeStartedRunManifest(
    manifestPath: string,
    manifest: StartedRunManifest
): Promise<void> {
    await writeManifestFile(manifestPath, {
        schemaVersion: HARNESS_MANIFEST_SCHEMA_VERSION,
        status: HarnessRunStatuses.RUNNING,
        ...manifest
    });
}

export async function writeFinishedRunManifest(
    manifestPath: string,
    manifest: FinishedRunManifest
): Promise<HarnessArtifact> {
    await writeManifestFile(manifestPath, {
        schemaVersion: HARNESS_MANIFEST_SCHEMA_VERSION,
        ...manifest
    });
    return hashArtifact(manifestPath);
}

async function writeManifestFile(
    manifestPath: string,
    manifest: Readonly<Record<string, unknown>>
): Promise<void> {
    await writeFileAtomic(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`, {
        encoding: "utf8",
        mode: HARNESS_ARTIFACT_FILE_MODE
    });
}
