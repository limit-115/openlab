import { FindingStatus } from "@openlab/protocol/findings/finding-status.const";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { LeadStatus } from "@openlab/protocol/leads/lead-status.const";

export interface InvestigationReportSubject {
    readonly snapshot: StatusSnapshot;
    readonly runDirectory: string;
}

export function renderInvestigationReport(
    subject: InvestigationReportSubject,
    title: string,
    summary: string
): string {
    const snapshot = subject.snapshot;
    const confirmed = snapshot.findings
        .filter(({ status }) => status === FindingStatus.CONFIRMED)
        .map((finding) => `${finding.claim} — ${verdictFor(snapshot, finding.id)}`);
    const refuted = snapshot.findings
        .filter(({ status }) => status === FindingStatus.REFUTED)
        .map((finding) => `${finding.claim} — ${verdictFor(snapshot, finding.id)}`);
    const spent = snapshot.leads
        .filter(({ status }) => status === LeadStatus.EXHAUSTED)
        .map(
            ({ statement, outcome }) =>
                `${statement} — ${outcome ?? "the researcher came back with nothing"}`
        );
    const open = snapshot.leads
        .filter(({ status }) => status !== LeadStatus.EXHAUSTED)
        .map(({ statement, status }) => `[${status}] ${statement}`);
    const blockers = snapshot.capability_requests
        .filter(({ blocking }) => blocking)
        .map(({ need, reason }) => `${need} — ${reason}`);

    return `# ${title}

## Goal

${snapshot.investigation.goal}

## Summary

${summary}

## Confirmed findings

${markdownList(confirmed, "Nothing has survived verification.")}

## Claims a verifier refuted

${markdownList(refuted, "None recorded.")}

## Leads that ran out

${markdownList(spent, "None recorded.")}

## Leads still open

${markdownList(open, "None recorded.")}

## Resources the investigation is waiting on

${markdownList(blockers, "None recorded.")}
`;
}

function verdictFor(snapshot: StatusSnapshot, findingId: string): string {
    const verdict = snapshot.verdicts.find((candidate) => candidate.finding_id === findingId);
    return verdict?.reasoning ?? "no verdict recorded";
}

function markdownList(items: readonly string[], empty: string): string {
    return items.length === 0 ? `- ${empty}` : items.map((item) => `- ${item}`).join("\n");
}
