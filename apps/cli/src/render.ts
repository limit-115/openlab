import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import type { Assumption } from "@lab/protocol/assumptions/assumption.types";
import { AssumptionStatus } from "@lab/protocol/assumptions/assumption-status.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import { FindingStatus } from "@lab/protocol/findings/finding-status.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import Table from "cli-table3";

function lines(items: string[]): string {
    return items.length === 0 ? "—" : items.map((item) => `• ${item}`).join("\n");
}

export function renderStatus(status: StatusSnapshot): string {
    const table = new Table({
        colWidths: [20, 78],
        wordWrap: true,
        style: { head: ["cyan"], border: ["gray"] }
    });
    const live = status.assumptions.filter(
        ({ status: bet }) => bet === AssumptionStatus.OPEN || bet === AssumptionStatus.RESEARCHING
    ).length;
    const confirmed = status.findings.filter(
        ({ status: finding }) => finding === FindingStatus.CONFIRMED
    ).length;
    table.push(
        ["State", status.lab.state],
        ["Lab", status.lab.id],
        ["Goal", status.lab.goal],
        ["Bets", `${live} live of ${status.assumptions.length}`],
        [
            "Agents",
            `${status.runs.filter((run) => run.status === AgentRunStatus.RUNNING).length} running`
        ],
        ["Findings", `${confirmed} confirmed of ${status.findings.length}`],
        [
            "Blockers",
            lines(
                status.capability_requests
                    .filter(({ blocking }) => blocking)
                    .map(({ need }) => need)
            )
        ]
    );
    return table.toString();
}

export function renderAssumptions(assumptions: Assumption[]): string {
    if (assumptions.length === 0) {
        return "No bets placed yet.";
    }
    const table = new Table({
        head: ["Bet", "Status", "Why it was worth taking", "What came back"],
        colWidths: [30, 18, 26, 26],
        wordWrap: true,
        style: { head: ["cyan"], border: ["gray"] }
    });
    for (const assumption of assumptions) {
        table.push([
            assumption.statement,
            assumption.status,
            assumption.rationale,
            assumption.outcome ?? ""
        ]);
    }
    return table.toString();
}

export function renderCapabilities(requests: CapabilityRequest[]): string {
    if (requests.length === 0) {
        return "No capability requests.";
    }
    const table = new Table({
        head: ["ID", "Status", "Need", "Tried alone", "Your answer"],
        colWidths: [26, 12, 26, 26, 26],
        wordWrap: true,
        style: { head: ["cyan"], border: ["gray"] }
    });
    for (const request of requests) {
        table.push([
            request.id,
            request.status,
            request.need,
            request.self_provisioning_attempt ?? "",
            request.answer ?? ""
        ]);
    }
    return table.toString();
}
