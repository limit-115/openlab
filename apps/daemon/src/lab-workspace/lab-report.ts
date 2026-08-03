import path from "node:path";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";

const EvidenceDisposition = {
    SUPPORTS: "supports",
    CONTRADICTS: "contradicts"
} as const;

export interface ReportDetails {
    readonly supportingEvidenceIds?: readonly string[];
    readonly limitations?: readonly string[];
    readonly knownCounterexamples?: readonly string[];
    readonly nextExperiments?: readonly string[];
}

export interface LabReportSubject {
    readonly snapshot: StatusSnapshot;
    readonly evidence: readonly Evidence[];
    readonly runDirectory: string;
}

export function renderLabReport(
    subject: LabReportSubject,
    title: string,
    summary: string,
    details: ReportDetails = {}
): string {
    const snapshot = subject.snapshot;
    const selectedEvidenceIds = new Set(details.supportingEvidenceIds ?? []);
    const evidence = subject.evidence.map((item) => {
        const disposition = item.supports
            ? EvidenceDisposition.SUPPORTS
            : EvidenceDisposition.CONTRADICTS;
        const selected = selectedEvidenceIds.has(item.id) ? " [completion evidence]" : "";
        const artifact =
            item.artifact_path === undefined
                ? ""
                : `; artifact: ${path.relative(subject.runDirectory, item.artifact_path)}`;
        return `${item.id}${selected} (${item.kind}, ${disposition}): ${item.summary}${artifact}`;
    });
    const counterexamples = [
        ...(details.knownCounterexamples ?? []),
        ...snapshot.claims
            .filter(({ status }) => status === ClaimStatus.REFUTED)
            .map(({ statement }) => statement),
        ...subject.evidence.filter(({ supports }) => !supports).map(({ summary }) => summary)
    ];
    const limitations = details.limitations ?? snapshot.frontier.blockers;
    const nextExperiments = details.nextExperiments ?? snapshot.frontier.next_experiments;

    return `# ${title}

## Goal

${snapshot.lab.goal}

## Summary

${summary}

## Claims

${markdownList(
    snapshot.claims.map((claim) => `[${claim.status}] ${claim.statement}`),
    "No claims recorded."
)}

## Evidence

${markdownList(evidence, "No material evidence recorded.")}

## Known counterexamples and negative results

${markdownList([...new Set(counterexamples)], "None recorded.")}

## Blockers and limitations

${markdownList([...new Set(limitations)], "None recorded.")}

## Next experiments

${markdownList([...new Set(nextExperiments)], "No informative experiment remains.")}
`;
}

function markdownList(items: readonly string[], empty: string): string {
    return items.length === 0 ? `- ${empty}` : items.map((item) => `- ${item}`).join("\n");
}
