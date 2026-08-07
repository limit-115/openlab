import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import type { SpendCaps } from "@openlab/protocol/spend-caps/spend-cap.types";
import { SubscriptionAllowanceState } from "@openlab/protocol/subscription-allowance/subscription-allowance.const";
import type { SubscriptionAllowanceRoster } from "@openlab/protocol/subscription-allowance/subscription-allowance.types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubscriptionAllowanceList } from "#src/subscription-allowance/subscription-allowance-list";

const ROSTER: SubscriptionAllowanceRoster = [
    {
        harness: AgentHarnessKind.CLAUDE,
        state: SubscriptionAllowanceState.AVAILABLE,
        plan: "max",
        balance: null,
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
        balance: null,
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
        balance: null,
        windows: [],
        error: "No ZCode login store at /Users/operator/.zcode/v2/config.json",
        read_at: "2026-08-03T12:00:00.000Z"
    },
    {
        harness: AgentHarnessKind.DEEPSEEK,
        state: SubscriptionAllowanceState.AVAILABLE,
        plan: null,
        balance: "4.21 USD",
        windows: [],
        error: null,
        read_at: "2026-08-03T12:00:00.000Z"
    }
];

const CLAUDE_SESSION_CAP = [
    { harness: AgentHarnessKind.CLAUDE, window_minutes: 300, max_used_percent: 40 }
];

function renderList(caps: SpendCaps = [], heldBy: SpendCaps = caps) {
    return render(
        <SubscriptionAllowanceList
            allowances={ROSTER}
            caps={caps}
            heldBy={heldBy}
            setCap={() => undefined}
        />
    );
}

describe("SubscriptionAllowanceList", () => {
    it("meters each window against what the vendor said is spent", () => {
        renderList();

        const session = screen.getByLabelText<HTMLProgressElement>("5 hours window");
        const week = screen.getAllByLabelText<HTMLProgressElement>("7 days window");

        expect(session.value).toBe(41);
        expect(week.map((meter) => meter.value)).toEqual([28, 100]);
    });

    it("marks the subscription the lab will pass over", () => {
        renderList();

        expect(screen.getByText("No allowance left")).toBeInTheDocument();
        expect(screen.getByText("Plus")).toBeInTheDocument();
    });

    it("gives the vendor's reason in full when a subscription could not be read", () => {
        renderList();

        expect(
            screen.getByText("No ZCode login store at /Users/operator/.zcode/v2/config.json")
        ).toBeInTheDocument();
        expect(screen.queryByLabelText("30 days window")).not.toBeInTheDocument();
    });

    it("stands each limiter at the cap set on that window, and at the end of an uncapped one", () => {
        renderList(CLAUDE_SESSION_CAP);

        expect(
            screen.getByRole("slider", { name: "5 hours spend cap" }).getAttribute("aria-valuenow")
        ).toBe("40");
        expect(
            screen
                .getAllByRole("slider", { name: "7 days spend cap" })[0]
                ?.getAttribute("aria-valuenow")
        ).toBe("100");
    });

    it("says which subscription the lab is holding back at the operator's own cap", () => {
        renderList(CLAUDE_SESSION_CAP);

        expect(screen.getByText("Held at your cap")).toBeInTheDocument();
        expect(screen.getByText("stops at 40%")).toBeInTheDocument();
    });

    it("holds nothing back on a cap the operator has dragged but not yet handed over", () => {
        renderList(CLAUDE_SESSION_CAP, []);

        expect(screen.queryByText("Held at your cap")).not.toBeInTheDocument();
    });

    /**
     * A wallet reading carries no windows, so without its balance a token-billed harness would sit
     * on the page as a name and nothing else — which is how it used to reach here before money and
     * plan tiers became separate readings.
     */
    it("states what a token-billed harness has left, which is all it has to report", () => {
        renderList();

        expect(screen.getByText("4.21 USD")).toBeInTheDocument();
    });

    it("meters without a limiter where the caps are not the page's to move", () => {
        render(<SubscriptionAllowanceList allowances={ROSTER} caps={[]} heldBy={[]} />);

        expect(screen.queryByRole("slider")).not.toBeInTheDocument();
        expect(screen.getByLabelText("5 hours window")).toBeInTheDocument();
    });
});
