import { describe, expect, it } from "vitest";
import {
    AgentActivityFrameKind,
    AgentToolPhase
} from "#src/agent-activity/agent-activity-frame.const";
import { AgentActivityFrameSchema } from "#src/agent-activity/agent-activity-frame.schema";

const base = {
    agent_id: "agent-researcher-0-1",
    run_id: "run-9f0c",
    sequence: 12,
    occurred_at: "2026-08-03T10:00:00.000Z"
};

describe("AgentActivityFrameSchema", () => {
    it("distinguishes a chunk of a turn from the sealed text that replaces it", () => {
        const chunk = AgentActivityFrameSchema.parse({
            ...base,
            kind: AgentActivityFrameKind.THINKING,
            turn: 0,
            text: "The evaluator fails on an ",
            sealed: false
        });
        const sealed = AgentActivityFrameSchema.parse({
            ...base,
            sequence: 13,
            kind: AgentActivityFrameKind.THINKING,
            turn: 0,
            text: "The evaluator fails on an empty sample.",
            sealed: true
        });

        expect(chunk).toMatchObject({ sealed: false, turn: 0 });
        expect(sealed).toMatchObject({ sealed: true, turn: 0 });
    });

    it("carries reasoning and assistant text through one frame shape", () => {
        const message = AgentActivityFrameSchema.parse({
            ...base,
            kind: AgentActivityFrameKind.MESSAGE,
            turn: 1,
            text: "Added the guard and reran the suite.",
            sealed: true
        });

        expect(message.kind).toBe(AgentActivityFrameKind.MESSAGE);
    });

    it("rejects a text frame that does not say whether the turn is complete", () => {
        expect(() =>
            AgentActivityFrameSchema.parse({
                ...base,
                kind: AgentActivityFrameKind.THINKING,
                turn: 0,
                text: "partial"
            })
        ).toThrow();
    });

    it("keeps a tool call's detail whole or absent, never empty", () => {
        const call = AgentActivityFrameSchema.parse({
            ...base,
            kind: AgentActivityFrameKind.TOOL,
            tool_name: "Bash",
            call_id: "toolu_01",
            phase: AgentToolPhase.STARTED,
            detail: "pnpm vitest run evaluators/"
        });

        expect(call).toMatchObject({ detail: "pnpm vitest run evaluators/" });
        expect(() =>
            AgentActivityFrameSchema.parse({
                ...base,
                kind: AgentActivityFrameKind.TOOL,
                tool_name: "Bash",
                call_id: null,
                phase: AgentToolPhase.STARTED,
                detail: ""
            })
        ).toThrow();
    });

    it("rejects a frame kind the dashboard has no renderer for", () => {
        expect(() =>
            AgentActivityFrameSchema.parse({ ...base, kind: "stdout", text: "hello" })
        ).toThrow();
    });
});
