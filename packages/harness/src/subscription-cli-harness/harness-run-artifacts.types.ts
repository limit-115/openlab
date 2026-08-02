import type { FileHandle } from "node:fs/promises";
import type { HarnessArtifact } from "#src/agent-harness/agent-harness.types";

export interface HarnessRunFiles {
    readonly artifactDirectory: string;
    readonly prompt: HarnessArtifact;
    readonly responseSchema?: HarnessArtifact;
    readonly nativeEventsPath: string;
    readonly eventsPath: string;
    readonly stderrPath: string;
    readonly manifestPath: string;
    readonly nativeEventsHandle: FileHandle;
    readonly eventsHandle: FileHandle;
}

export interface NonManifestArtifacts {
    readonly prompt: HarnessArtifact;
    readonly nativeEvents: HarnessArtifact;
    readonly events: HarnessArtifact;
    readonly stderr: HarnessArtifact;
    readonly responseSchema?: HarnessArtifact;
}
