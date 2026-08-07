import type { FileHandle } from "node:fs/promises";
import { z } from "zod";
import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import { HarnessEventTypes } from "#src/agent-harness/harness-event.const";
import type { HarnessCompletedEvent, HarnessEvent } from "#src/agent-harness/harness-event.types";
import type { ParsedHarnessEvent } from "#src/agent-harness/harness-event-parser.types";
import { HarnessProtocolError } from "#src/cli-execution/harness-error";

const NativeEventSchema = z.record(z.string(), z.unknown());

export function parseNativeEvent(
    kind: HarnessKind,
    line: string
): Readonly<Record<string, unknown>> {
    try {
        return NativeEventSchema.parse(JSON.parse(line));
    } catch (error) {
        throw new HarnessProtocolError(kind, `${kind} emitted invalid JSONL: ${line}`, {
            cause: error
        });
    }
}

export function stampEvent(
    event: ParsedHarnessEvent,
    sequence: number,
    harness: HarnessKind,
    sessionId: string | null
): Exclude<HarnessEvent, HarnessCompletedEvent> {
    const base = {
        sequence,
        occurredAt: new Date().toISOString(),
        harness,
        sessionId
    };

    switch (event.type) {
        case HarnessEventTypes.SESSION_STARTED:
            return { ...base, ...event };
        case HarnessEventTypes.ASSISTANT_DELTA:
        case HarnessEventTypes.ASSISTANT_COMPLETED:
        case HarnessEventTypes.REASONING_DELTA:
        case HarnessEventTypes.REASONING_COMPLETED:
            return { ...base, ...event };
        case HarnessEventTypes.TOOL:
            return { ...base, ...event };
        case HarnessEventTypes.USAGE:
            return { ...base, ...event };
        case HarnessEventTypes.DIAGNOSTIC:
            return { ...base, ...event };
        case HarnessEventTypes.NATIVE:
            return { ...base, ...event };
    }
}

export async function appendNativeEventLine(handle: FileHandle, line: string): Promise<void> {
    await handle.appendFile(`${line}\n`, "utf8");
}

export async function appendEvent(handle: FileHandle, event: HarnessEvent): Promise<void> {
    await handle.appendFile(`${JSON.stringify(event)}\n`, "utf8");
}
