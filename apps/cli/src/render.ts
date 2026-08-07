import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import type { CapabilityRequest } from "@openlab/protocol/capabilities/capability-request.types";
import { FindingStatus } from "@openlab/protocol/findings/finding-status.const";
import type { InvestigationSummary } from "@openlab/protocol/investigation-status/investigation-summary.types";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import type { Lead } from "@openlab/protocol/leads/lead.types";
import { LeadStatus } from "@openlab/protocol/leads/lead-status.const";
import Table from "cli-table3";

function lines(items: string[]): string {
    return items.length === 0 ? "—" : items.map((item) => `• ${item}`).join("\n");
}

/** The roster: what the lab is chasing, and where each investigation stands. */
export function renderInvestigations(roster: readonly InvestigationSummary[]): string {
    if (roster.length === 0) {
        return 'The lab holds no investigations. Start one with "openlab new".';
    }
    const table = new Table({
        head: ["ID", "State", "Goal", "Leads", "Findings", "Agents"],
        colWidths: [40, 14, 44, 8, 12, 8],
        wordWrap: true,
        style: { head: ["cyan"], border: ["gray"] }
    });
    for (const investigation of roster) {
        table.push([
            investigation.id,
            investigation.state,
            investigation.goal,
            String(investigation.lead_count),
            `${investigation.confirmed_finding_count} of ${investigation.finding_count}`,
            String(investigation.active_run_count)
        ]);
    }
    return table.toString();
}

export function renderStatus(status: StatusSnapshot): string {
    const table = new Table({
        colWidths: [20, 78],
        wordWrap: true,
        style: { head: ["cyan"], border: ["gray"] }
    });
    const live = status.leads.filter(
        ({ status: lead }) => lead === LeadStatus.OPEN || lead === LeadStatus.RESEARCHING
    ).length;
    const confirmed = status.findings.filter(
        ({ status: finding }) => finding === FindingStatus.CONFIRMED
    ).length;
    table.push(
        ["State", status.investigation.state],
        ["Investigation", status.investigation.id],
        ["Goal", status.investigation.goal],
        ["Leads", `${live} live of ${status.leads.length}`],
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

export function renderLeads(leads: Lead[]): string {
    if (leads.length === 0) {
        return "No leads opened yet.";
    }
    const table = new Table({
        head: ["Lead", "Status", "Why it was worth taking", "What came back"],
        colWidths: [30, 18, 26, 26],
        wordWrap: true,
        style: { head: ["cyan"], border: ["gray"] }
    });
    for (const lead of leads) {
        table.push([lead.statement, lead.status, lead.rationale, lead.outcome ?? ""]);
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
