import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import type { FrontierSnapshot } from "@lab/protocol/research-frontier/frontier-snapshot.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
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
    table.push(
        ["State", status.lab.state],
        ["Lab", status.lab.id],
        ["Goal", status.lab.goal],
        [
            "Branches",
            String(status.branches.filter((branch) => branch.status === BranchStatus.ACTIVE).length)
        ],
        [
            "Tasks",
            `${status.tasks.filter((task) => task.status === InternalTaskStatus.RUNNING).length} running`
        ],
        ["Claims", `${status.claims.length} total`],
        ["Experiments", `${status.experiments.length} total`],
        ["Blockers", lines(status.frontier.blockers)]
    );
    return table.toString();
}

export function renderFrontier(frontier: FrontierSnapshot): string {
    const table = new Table({
        colWidths: [24, 74],
        wordWrap: true,
        style: { head: ["cyan"], border: ["gray"] }
    });
    table.push(
        ["Known", lines(frontier.known)],
        ["Open questions", lines(frontier.open_questions)],
        ["Blockers", lines(frontier.blockers)],
        ["Next experiments", lines(frontier.next_experiments)],
        ["Updated", frontier.updated_at]
    );
    return table.toString();
}

export function renderCapabilities(requests: CapabilityRequest[]): string {
    if (requests.length === 0) {
        return "No capability requests.";
    }
    const table = new Table({
        head: ["ID", "Status", "Need", "Reason"],
        colWidths: [26, 12, 28, 42],
        wordWrap: true,
        style: { head: ["cyan"], border: ["gray"] }
    });
    for (const request of requests) {
        table.push([request.id, request.status, request.need, request.reason]);
    }
    return table.toString();
}
