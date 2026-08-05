import { AgentActivityPhase } from "@nightlab/protocol/agent-activity/agent-activity.const";
import {
    AgentActivityFrameKind,
    AgentToolPhase
} from "@nightlab/protocol/agent-activity/agent-activity-frame.const";
import { AgentRunStatus } from "@nightlab/protocol/agent-runs/agent-run-status.const";
import { beforeEach, describe, expect, it } from "vitest";
import { StreamState } from "#src/live-status/status-stream.const";
import type { TranscriptTurn } from "#src/team/agent-transcript.types";
import {
    type AgentActivityStore,
    createAgentActivityStore
} from "#src/team/agent-transcript-store";
import type { RedrawSchedule } from "#src/team/agent-transcript-store.types";
import {
    frame,
    message,
    resetFrameSequence,
    thinking,
    toolCall,
    watchedActivity
} from "#src/team/team.fixture";

const ENGINEER = "agent-engineer-0-1";

const immediate: RedrawSchedule = (notify) => notify();

function watching(...roster: ReturnType<typeof watchedActivity>[]): AgentActivityStore {
    const store = createAgentActivityStore(immediate);
    store.getState().receiveRoster(roster.length > 0 ? roster : [watchedActivity()]);
    return store;
}

function agentsOf(store: AgentActivityStore) {
    return store.getState().agents;
}

function transcriptOf(store: AgentActivityStore) {
    const [agent] = agentsOf(store);
    if (agent === undefined) {
        throw new Error("The store is watching no agent");
    }
    return agent.transcript;
}

describe("AgentActivityStore", () => {
    beforeEach(resetFrameSequence);

    it("grows a turn from its chunks while the model is still writing", () => {
        const store = watching();
        const { receiveFrame } = store.getState();

        receiveFrame(thinking("The evaluator ", 0, false));
        receiveFrame(thinking("fails on an empty sample.", 0, false));

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
        fromStart.getState().receiveFrame(thinking("The evaluator ", 0, false));
        fromStart.getState().receiveFrame(thinking("fails", 0, false));
        fromStart
            .getState()
            .receiveFrame(thinking("The evaluator fails on an empty sample.", 0, true));

        resetFrameSequence();
        const joinedLate = watching();
        const { receiveFrame } = joinedLate.getState();
        receiveFrame(
            frame({ kind: AgentActivityFrameKind.THINKING, turn: 0, text: "x", sealed: false })
        );
        receiveFrame(
            frame({ kind: AgentActivityFrameKind.THINKING, turn: 0, text: "y", sealed: false })
        );
        receiveFrame(thinking("The evaluator fails on an empty sample.", 0, true));

        const [first] = transcriptOf(fromStart) as TranscriptTurn[];
        const [second] = transcriptOf(joinedLate) as TranscriptTurn[];
        expect(first?.text).toBe("The evaluator fails on an empty sample.");
        expect(second?.text).toBe(first?.text);
    });

    it("keeps reasoning and message turns apart even when they share a number", () => {
        const store = watching();
        const { receiveFrame } = store.getState();

        receiveFrame(thinking("weighing options", 0, true));
        receiveFrame(message("Added the guard", 0, true));

        expect(transcriptOf(store).map(({ kind }) => kind)).toEqual([
            AgentActivityFrameKind.THINKING,
            AgentActivityFrameKind.MESSAGE
        ]);
    });

    it("advances a tool call instead of listing its result separately", () => {
        const store = watching();
        const { receiveFrame } = store.getState();

        receiveFrame(
            toolCall("Bash", "toolu_01", AgentToolPhase.STARTED, "pnpm vitest run evaluators/")
        );
        receiveFrame(toolCall("tool_result", "toolu_01", AgentToolPhase.COMPLETED));

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
        const { receiveFrame } = store.getState();

        receiveFrame(toolCall("reasoning", null));
        receiveFrame(toolCall("reasoning", null));

        expect(transcriptOf(store)).toHaveLength(2);
    });

    it("moves an agent off Starting as soon as it reports doing something", () => {
        const store = watching(watchedActivity({ phase: AgentActivityPhase.STARTING }));

        store.getState().receiveFrame(toolCall("Bash", "toolu_01"));

        expect(agentsOf(store)[0]?.activity.phase).toBe(AgentActivityPhase.USING_TOOL);
    });

    it("leaves the phase where it was when a frame only reports usage", () => {
        const store = watching();
        const { receiveFrame } = store.getState();
        receiveFrame(toolCall("Bash", "toolu_01"));

        receiveFrame(
            frame({
                kind: AgentActivityFrameKind.USAGE,
                usage: { input_tokens: 28575, output_tokens: 5020, cached_input_tokens: 26368 }
            })
        );

        expect(agentsOf(store)[0]?.activity.phase).toBe(AgentActivityPhase.USING_TOOL);
    });

    it("records how a run ended on the agent it belongs to", () => {
        const store = watching();

        store.getState().receiveFrame(
            frame({
                kind: AgentActivityFrameKind.RUN_FINISHED,
                status: AgentRunStatus.TIMED_OUT,
                error: "claude harness run timed out"
            })
        );

        expect(agentsOf(store)[0]?.activity).toMatchObject({
            status: AgentRunStatus.TIMED_OUT,
            error: "claude harness run timed out"
        });
    });

    it("ignores a frame from a run the agent has already moved on from", () => {
        const store = watching();

        store
            .getState()
            .receiveFrame({ ...thinking("from a retired attempt", 0, true), run_id: "run-codex" });

        expect(transcriptOf(store)).toEqual([]);
    });

    it("tells its readers once for a burst of chunks rather than once each", () => {
        const notifications: (() => void)[] = [];
        const store = createAgentActivityStore((notify) => notifications.push(notify));
        store.getState().receiveRoster([watchedActivity()]);
        let redraws = 0;
        store.subscribe(() => {
            redraws += 1;
        });

        const { receiveFrame } = store.getState();
        receiveFrame(thinking("a", 0, false));
        receiveFrame(thinking("b", 0, false));
        receiveFrame(thinking("c", 0, false));
        for (const notify of notifications.splice(0)) {
            notify();
        }

        expect(redraws).toBe(1);
        expect((transcriptOf(store)[0] as TranscriptTurn).text).toBe("abc");
    });

    /** A card is left alone when it compares equal, so an untouched agent must keep its identity. */
    it("hands back the very same agent when the frame belonged to somebody else", () => {
        const store = watching(watchedActivity(), watchedActivity({ run_id: ENGINEER }));
        const [researcher] = agentsOf(store);

        store.getState().receiveFrame(
            frame(
                {
                    kind: AgentActivityFrameKind.THINKING,
                    turn: 0,
                    text: "weighing",
                    sealed: false
                },
                ENGINEER
            )
        );

        expect(agentsOf(store)[1]?.transcript).toHaveLength(1);
        expect(agentsOf(store)[0]).toBe(researcher);
    });

    it("says nothing to its readers when the stream repeats that it is live", () => {
        const store = watching();
        store.getState().setStreamState(StreamState.LIVE);
        let redraws = 0;
        store.subscribe(() => {
            redraws += 1;
        });

        store.getState().setStreamState(StreamState.LIVE);

        expect(redraws).toBe(0);
        expect(store.getState().state).toBe(StreamState.LIVE);
    });
});
