import {
    AgentActivityPhase,
    AgentRunStatus
} from "@lab/protocol/agent-activity/agent-activity.const";
import {
    AgentActivityFrameKind,
    AgentToolPhase
} from "@lab/protocol/agent-activity/agent-activity-frame.const";
import { beforeEach, describe, expect, it } from "vitest";
import type { TranscriptTurn } from "#src/team/agent-transcript.types";
import { AgentActivityStore } from "#src/team/agent-transcript-store";
import {
    frame,
    message,
    resetFrameSequence,
    thinking,
    toolCall,
    watchedActivity
} from "#src/team/team.fixture";

function immediate(notify: () => void): void {
    notify();
}

function watching(): AgentActivityStore {
    const store = new AgentActivityStore(immediate);
    store.receiveRoster([watchedActivity()]);
    return store;
}

function transcriptOf(store: AgentActivityStore) {
    const [agent] = store.getSnapshot();
    if (agent === undefined) {
        throw new Error("The store is watching no agent");
    }
    return agent.transcript;
}

describe("AgentActivityStore", () => {
    beforeEach(resetFrameSequence);

    it("grows a turn from its chunks while the model is still writing", () => {
        const store = watching();

        store.receiveFrame(thinking("The evaluator ", 0, false));
        store.receiveFrame(thinking("fails on an empty sample.", 0, false));

        expect(transcriptOf(store)).toEqual([
            expect.objectContaining({
                kind: AgentActivityFrameKind.THINKING,
                text: "The evaluator fails on an empty sample.",
                sealed: false
            })
        ]);
    });

    it("lands on the same words whether a viewer saw the chunks or only the sealed turn", () => {
        const fromStart = watching();
        fromStart.receiveFrame(thinking("The evaluator ", 0, false));
        fromStart.receiveFrame(thinking("fails", 0, false));
        fromStart.receiveFrame(thinking("The evaluator fails on an empty sample.", 0, true));

        resetFrameSequence();
        const joinedLate = watching();
        joinedLate.receiveFrame(
            frame({ kind: AgentActivityFrameKind.THINKING, turn: 0, text: "x", sealed: false })
        );
        joinedLate.receiveFrame(
            frame({ kind: AgentActivityFrameKind.THINKING, turn: 0, text: "y", sealed: false })
        );
        joinedLate.receiveFrame(thinking("The evaluator fails on an empty sample.", 0, true));

        const [first] = transcriptOf(fromStart) as TranscriptTurn[];
        const [second] = transcriptOf(joinedLate) as TranscriptTurn[];
        expect(first?.text).toBe("The evaluator fails on an empty sample.");
        expect(second?.text).toBe(first?.text);
    });

    it("keeps reasoning and message turns apart even when they share a number", () => {
        const store = watching();

        store.receiveFrame(thinking("weighing options", 0, true));
        store.receiveFrame(message("Added the guard", 0, true));

        expect(transcriptOf(store).map(({ kind }) => kind)).toEqual([
            AgentActivityFrameKind.THINKING,
            AgentActivityFrameKind.MESSAGE
        ]);
    });

    it("advances a tool call instead of listing its result separately", () => {
        const store = watching();

        store.receiveFrame(
            toolCall("Bash", "toolu_01", AgentToolPhase.STARTED, "pnpm vitest run evaluators/")
        );
        store.receiveFrame(toolCall("tool_result", "toolu_01", AgentToolPhase.COMPLETED));

        expect(transcriptOf(store)).toEqual([
            expect.objectContaining({
                toolName: "Bash",
                phase: AgentToolPhase.COMPLETED,
                detail: "pnpm vitest run evaluators/"
            })
        ]);
    });

    it("lists tool calls the harness gave no identity separately", () => {
        const store = watching();

        store.receiveFrame(toolCall("reasoning", null));
        store.receiveFrame(toolCall("reasoning", null));

        expect(transcriptOf(store)).toHaveLength(2);
    });

    it("moves an agent off Starting as soon as it reports doing something", () => {
        const store = new AgentActivityStore(immediate);
        store.receiveRoster([watchedActivity({ phase: AgentActivityPhase.STARTING })]);

        store.receiveFrame(toolCall("Bash", "toolu_01"));

        expect(store.getSnapshot()[0]?.activity.phase).toBe(AgentActivityPhase.USING_TOOL);
    });

    it("leaves the phase where it was when a frame only reports usage", () => {
        const store = watching();
        store.receiveFrame(toolCall("Bash", "toolu_01"));

        store.receiveFrame(
            frame({
                kind: AgentActivityFrameKind.USAGE,
                usage: { input_tokens: 28575, output_tokens: 5020, cached_input_tokens: 26368 }
            })
        );

        expect(store.getSnapshot()[0]?.activity.phase).toBe(AgentActivityPhase.USING_TOOL);
    });

    it("records how a run ended on the agent it belongs to", () => {
        const store = watching();

        store.receiveFrame(
            frame({
                kind: AgentActivityFrameKind.RUN_FINISHED,
                status: AgentRunStatus.TIMED_OUT,
                error: "claude harness run timed out"
            })
        );

        expect(store.getSnapshot()[0]?.activity).toMatchObject({
            status: AgentRunStatus.TIMED_OUT,
            error: "claude harness run timed out"
        });
    });

    it("ignores a frame from a run the agent has already moved on from", () => {
        const store = watching();

        store.receiveFrame({ ...thinking("from a retired attempt", 0, true), run_id: "run-codex" });

        expect(transcriptOf(store)).toEqual([]);
    });

    it("tells its readers once for a burst of chunks rather than once each", () => {
        const notifications: (() => void)[] = [];
        const store = new AgentActivityStore((notify) => notifications.push(notify));
        store.receiveRoster([watchedActivity()]);
        let redraws = 0;
        store.subscribe(() => {
            redraws += 1;
        });

        store.receiveFrame(thinking("a", 0, false));
        store.receiveFrame(thinking("b", 0, false));
        store.receiveFrame(thinking("c", 0, false));
        for (const notify of notifications.splice(0)) {
            notify();
        }

        expect(redraws).toBe(1);
        expect((transcriptOf(store)[0] as TranscriptTurn).text).toBe("abc");
    });
});
