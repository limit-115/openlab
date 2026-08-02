import { HarnessRunStatuses } from "@lab/harness/agent-harness.const";
import {
    HarnessDiagnosticLevels,
    HarnessEventTypes,
    HarnessToolPhases
} from "@lab/harness/harness-event.const";
import type { HarnessEvent } from "@lab/harness/harness-event.types";
import { AgentRunStatus } from "@lab/protocol/agent-activity/agent-activity.const";
import { AgentActivityFrameKind } from "@lab/protocol/agent-activity/agent-activity-frame.const";
import { AgentActivityFrameSchema } from "@lab/protocol/agent-activity/agent-activity-frame.schema";
import { describe, expect, it } from "vitest";
import { UNSPECIFIED_DIAGNOSTIC } from "#src/agent-activity/agent-activity.const";
import {
    activityIdentity,
    harnessEvents,
    harnessRunResult
} from "#src/agent-activity/agent-activity.fixture";
import { HarnessEventTranslator } from "#src/agent-activity/harness-event-translation";

function translateAll(events: readonly HarnessEvent[]) {
    const translator = new HarnessEventTranslator(activityIdentity());
    return events
        .map((event) => translator.translate(event))
        .filter((frame) => frame !== undefined)
        .map((frame) => AgentActivityFrameSchema.parse(frame));
}

describe("HarnessEventTranslator", () => {
    it("numbers a second turn only after the first one is sealed", () => {
        const frames = translateAll(
            harnessEvents([
                { type: HarnessEventTypes.REASONING_DELTA, text: "weigh " },
                { type: HarnessEventTypes.REASONING_DELTA, text: "options" },
                { type: HarnessEventTypes.REASONING_COMPLETED, text: "weigh options" },
                { type: HarnessEventTypes.REASONING_DELTA, text: "now decide" }
            ])
        );

        expect(frames.map((frame) => "turn" in frame && frame.turn)).toEqual([0, 0, 0, 1]);
    });

    it("numbers reasoning and assistant turns independently", () => {
        const frames = translateAll(
            harnessEvents([
                { type: HarnessEventTypes.REASONING_COMPLETED, text: "planned" },
                { type: HarnessEventTypes.REASONING_COMPLETED, text: "revised" },
                { type: HarnessEventTypes.ASSISTANT_COMPLETED, text: "done" }
            ])
        );

        expect(
            frames.map((frame) => [frame.kind, "turn" in frame ? frame.turn : undefined])
        ).toEqual([
            [AgentActivityFrameKind.THINKING, 0],
            [AgentActivityFrameKind.THINKING, 1],
            [AgentActivityFrameKind.MESSAGE, 0]
        ]);
    });

    it("seals a turn with its whole text, not the trailing chunk", () => {
        const frames = translateAll(
            harnessEvents([
                { type: HarnessEventTypes.ASSISTANT_DELTA, text: "Added the " },
                { type: HarnessEventTypes.ASSISTANT_DELTA, text: "guard." },
                { type: HarnessEventTypes.ASSISTANT_COMPLETED, text: "Added the guard." }
            ])
        );
        const sealed = frames.find((frame) => "sealed" in frame && frame.sealed);

        expect(sealed).toMatchObject({ text: "Added the guard.", turn: 0 });
    });

    it("reads a tool's subject from a nested input payload and from a flat item", () => {
        const frames = translateAll(
            harnessEvents([
                {
                    type: HarnessEventTypes.TOOL,
                    phase: HarnessToolPhases.STARTED,
                    toolName: "Bash",
                    callId: "toolu_01",
                    payload: { type: "tool_use", input: { command: "pnpm vitest run evaluators/" } }
                },
                {
                    type: HarnessEventTypes.TOOL,
                    phase: HarnessToolPhases.COMPLETED,
                    toolName: "command_execution",
                    callId: "item_2",
                    payload: { command: "  python evaluate.py  " }
                },
                {
                    type: HarnessEventTypes.TOOL,
                    phase: HarnessToolPhases.COMPLETED,
                    toolName: "tool_result",
                    callId: "toolu_01",
                    payload: { type: "tool_result", content: "1 passed" }
                }
            ])
        );

        expect(frames.map((frame) => ("detail" in frame ? frame.detail : undefined))).toEqual([
            "pnpm vitest run evaluators/",
            "python evaluate.py",
            null
        ]);
    });

    it("keeps harness plumbing and the research result out of the stream", () => {
        const frames = translateAll(
            harnessEvents([
                { type: HarnessEventTypes.NATIVE, nativeType: "turn.started", payload: {} },
                { type: HarnessEventTypes.STRUCTURED_OUTPUT, value: { claims: [] } }
            ])
        );

        expect(frames).toEqual([]);
    });

    it("still describes a failure the harness reported without a message", () => {
        const [frame] = translateAll(
            harnessEvents([
                {
                    type: HarnessEventTypes.DIAGNOSTIC,
                    level: HarnessDiagnosticLevels.ERROR,
                    message: "   "
                }
            ])
        );

        expect(frame).toMatchObject({ message: UNSPECIFIED_DIAGNOSTIC });
    });

    it("reports how a run ended in terms the dashboard owns", () => {
        const [frame] = translateAll(
            harnessEvents([
                {
                    type: HarnessEventTypes.RUN_COMPLETED,
                    result: harnessRunResult({
                        status: HarnessRunStatuses.TIMED_OUT,
                        error: "claude harness run timed out"
                    })
                }
            ])
        );

        expect(frame).toMatchObject({
            kind: AgentActivityFrameKind.RUN_FINISHED,
            status: AgentRunStatus.TIMED_OUT,
            error: "claude harness run timed out"
        });
    });
});
