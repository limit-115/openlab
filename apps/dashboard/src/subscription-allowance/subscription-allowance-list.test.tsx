import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { SubscriptionAllowanceState } from "@lab/protocol/subscription-allowance/subscription-allowance.const";
import type { SubscriptionAllowanceRoster } from "@lab/protocol/subscription-allowance/subscription-allowance.types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubscriptionAllowanceList } from "#src/subscription-allowance/subscription-allowance-list";

const ROSTER: SubscriptionAllowanceRoster = [
    {
        harness: AgentHarnessKind.CLAUDE,
        state: SubscriptionAllowanceState.AVAILABLE,
        plan: "max",
        windows: [
            { duration_minutes: 300, used_percent: 41, resets_at: "2026-08-03T17:40:00.000Z" },
            { duration_minutes: 10_080, used_percent: 28, resets_at: "2026-08-08T07:00:00.000Z" }
        ],
        error: null,
        read_at: "2026-08-03T12:00:00.000Z"
    },
    {
        harness: AgentHarnessKind.CODEX,
        state: SubscriptionAllowanceState.EXHAUSTED,
        plan: "plus",
        windows: [
            { duration_minutes: 10_080, used_percent: 100, resets_at: "2026-08-09T13:50:53.000Z" }
        ],
        error: null,
        read_at: "2026-08-03T12:00:00.000Z"
    },
    {
        harness: AgentHarnessKind.GLM,
        state: SubscriptionAllowanceState.UNREADABLE,
        plan: null,
        windows: [],
        error: "No ZCode login store at /Users/operator/.zcode/v2/config.json",
        read_at: "2026-08-03T12:00:00.000Z"
    }
];

describe("SubscriptionAllowanceList", () => {
    it("meters each window against what the vendor said is spent", () => {
        render(<SubscriptionAllowanceList allowances={ROSTER} />);

        const session = screen.getByLabelText<HTMLProgressElement>("5 hours window");
        const week = screen.getAllByLabelText<HTMLProgressElement>("7 days window");

        expect(session.value).toBe(41);
        expect(week.map((meter) => meter.value)).toEqual([28, 100]);
    });

    it("marks the subscription the lab will pass over", () => {
        render(<SubscriptionAllowanceList allowances={ROSTER} />);

        expect(screen.getByText("No allowance left")).toBeInTheDocument();
        expect(screen.getByText("plus")).toBeInTheDocument();
    });

    it("gives the vendor's reason in full when a subscription could not be read", () => {
        render(<SubscriptionAllowanceList allowances={ROSTER} />);

        expect(
            screen.getByText("No ZCode login store at /Users/operator/.zcode/v2/config.json")
        ).toBeInTheDocument();
        expect(screen.queryByLabelText("30 days window")).not.toBeInTheDocument();
    });
});
