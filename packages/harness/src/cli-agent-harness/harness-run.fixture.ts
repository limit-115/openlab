import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "vitest";
import { z } from "zod";
import type { HarnessRunRequest } from "#src/agent-harness/agent-harness.types";
import { HarnessEventTypes } from "#src/agent-harness/harness-event.const";
import type { HarnessCompletedEvent, HarnessEvent } from "#src/agent-harness/harness-event.types";

const temporaryRoots: string[] = [];

export const TestTimeoutMilliseconds = {
    WATCHDOG: 10,
    INVALID: 0
} as const;

export async function harnessRequest(
    name: string,
    overrides: Partial<HarnessRunRequest> = {}
): Promise<HarnessRunRequest> {
    const root = await mkdtemp(join(tmpdir(), "lab-harness-"));
    temporaryRoots.push(root);
    return {
        prompt: "Solve the research task",
        cwd: root,
        artifactDirectory: join(root, name),
        ...overrides
    };
}

export async function removeHarnessRunDirectories(): Promise<void> {
    await Promise.all(
        temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true }))
    );
}

export function answerSchema(): z.ZodType {
    return z.object({ answer: z.number() });
}

/** The document a CLI must be handed for {@link answerSchema}, spelled out rather than derived. */
export const AnswerJsonSchema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: { answer: { type: "number" } },
    required: ["answer"],
    additionalProperties: false
} as const;

export function lastCompleted(events: readonly HarnessEvent[]): HarnessCompletedEvent {
    const event = events.at(-1);
    expect(event?.type).toBe(HarnessEventTypes.RUN_COMPLETED);
    if (event?.type !== HarnessEventTypes.RUN_COMPLETED) {
        throw new Error("Expected terminal harness event");
    }
    return event;
}
