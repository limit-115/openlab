import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { HarnessRunStatuses } from "#src/agent-harness/agent-harness.const";
import { HarnessArtifactFiles } from "#src/subscription-cli-harness/harness-run-artifacts.const";
import type { FinishedRunOutcome } from "#src/subscription-cli-harness/harness-run-outcome.types";

/** The fields both the started and the finished manifest share, plus the two only an end has. */
const RunManifestOutcomeSchema = z.object({
    status: z.enum(HarnessRunStatuses),
    error: z.string().nullable().optional(),
    finishedAt: z.iso.datetime().optional()
});

/**
 * How a run ended, read back from its manifest.
 *
 * The completion event is the one event a run cannot write to its own events.jsonl: it carries the
 * manifest, and the manifest carries that file's hash. The manifest is therefore the only durable
 * record of an outcome, and whoever reconstructs a finished run from disk reads it from here.
 *
 * A run that is still going has a manifest too, saying so, and is reported as no outcome yet.
 */
export async function readFinishedRunOutcome(
    artifactDirectory: string
): Promise<FinishedRunOutcome | undefined> {
    const manifest = await readManifest(resolve(artifactDirectory, HarnessArtifactFiles.MANIFEST));
    if (manifest === undefined) {
        return undefined;
    }
    const outcome = RunManifestOutcomeSchema.safeParse(manifest);
    if (!outcome.success) {
        return undefined;
    }
    const { status, error, finishedAt } = outcome.data;
    if (status === HarnessRunStatuses.RUNNING || finishedAt === undefined) {
        return undefined;
    }
    return { status, error: error?.trim() ? error.trim() : null, finishedAt };
}

async function readManifest(path: string): Promise<unknown> {
    try {
        return JSON.parse(await readFile(path, "utf8"));
    } catch {
        /** A run that has not written its manifest yet, or has half-written it, has no outcome. */
        return undefined;
    }
}
