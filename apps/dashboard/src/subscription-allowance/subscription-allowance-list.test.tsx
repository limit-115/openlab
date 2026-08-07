import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { SpendCapKinds } from "@openlab/protocol/spend-caps/spend-cap.const";
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
        windows: [
            { duration_minutes: 300, used_percent: 41, resets_at: "2026-08-03T17:40:00.000Z" },
            { duration_minutes: 10_080, used_percent: 28, resets_at: "2026-08-08T07:00:00.000Z" }
        ],
        balances: [],
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
        balances: [],
        error: null,
        read_at: "2026-08-03T12:00:00.000Z"
    },
    {
        harness: AgentHarnessKind.GLM,
        state: SubscriptionAllowanceState.UNREADABLE,
        plan: null,
        windows: [],
        balances: [],
        error: "No ZCode login store at /Users/operator/.zcode/v2/config.json",
        read_at: "2026-08-03T12:00:00.000Z"
    },
    {
        harness: AgentHarnessKind.DEEPSEEK,
        state: SubscriptionAllowanceState.AVAILABLE,
        plan: null,
        windows: [],
        balances: [{ currency: "USD", amount: "42.50" }],
        error: null,
        read_at: "2026-08-03T12:00:00.000Z"
    }
];

const CLAUDE_SESSION_CAP: SpendCaps = [
    {
        kind: SpendCapKinds.WINDOW_PERCENT,
        harness: AgentHarnessKind.CLAUDE,
        window_minutes: 300,
        max_used_percent: 40
    }
];

const DEEPSEEK_FLOOR: SpendCaps = [
    {
        kind: SpendCapKinds.WALLET_FLOOR,
        harness: AgentHarnessKind.DEEPSEEK,
        currency: "USD",
        minimum_balance: "50.00"
    }
];

function renderList(caps: SpendCaps = [], heldBy: SpendCaps = caps) {
    return render(
        <SubscriptionAllowanceList
            allowances={ROSTER}
            caps={caps}
            heldBy={heldBy}
            setCap={() => undefined}
            setFloor={() => undefined}
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

    it("meters without a limiter where the caps are not the page's to move", () => {
        render(<SubscriptionAllowanceList allowances={ROSTER} caps={[]} heldBy={[]} />);

        expect(screen.queryByRole("slider")).not.toBeInTheDocument();
        expect(screen.getByLabelText("5 hours window")).toBeInTheDocument();
    });

    it("shows what a wallet holds and offers a floor to keep money in it", () => {
        renderList();

        expect(screen.getByText("42.50 USD left")).toBeInTheDocument();
        expect(screen.getByText("no floor")).toBeInTheDocument();
        expect(screen.getByLabelText("Keep at least")).toHaveValue("");
    });

    it("stands the wallet field at the floor the operator set, and says where it stops", () => {
        renderList(DEEPSEEK_FLOOR);

        expect(screen.getByLabelText("Keep at least")).toHaveValue("50.00");
        expect(screen.getByText("stops at 50.00 USD")).toBeInTheDocument();
    });

    it("says which wallet the lab is holding back at the floor under it", () => {
        renderList(DEEPSEEK_FLOOR);

        expect(screen.getByText("Held at your cap")).toBeInTheDocument();
    });

    /** A wallet has no full to be a share of, so there is money and a field and no meter at all. */
    it("draws no meter over a wallet", () => {
        renderList();

        expect(screen.queryByLabelText("USD window")).not.toBeInTheDocument();
    });

    it("shows the money without a field where the caps are not the page's to move", () => {
        render(<SubscriptionAllowanceList allowances={ROSTER} caps={[]} heldBy={[]} />);

        expect(screen.getByText("42.50 USD left")).toBeInTheDocument();
        expect(screen.queryByLabelText("Keep at least")).not.toBeInTheDocument();
    });
});
