import { randomUUID } from "node:crypto";
import type { Finding } from "@openlab/protocol/findings/finding.types";
import { FindingStatus } from "@openlab/protocol/findings/finding-status.const";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import type { Lead } from "@openlab/protocol/leads/lead.types";
import { LeadStatus } from "@openlab/protocol/leads/lead-status.const";
import type { Verdict } from "@openlab/protocol/verdicts/verdict.types";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { requiredById } from "#src/investigation-workspace/snapshot-entities";
import type { LeadCandidate } from "#src/research-contract/research-contract";
import type { RecordFindingInput } from "#src/research-cycle/research-journal.types";

export async function recordLeads(
    workspace: InvestigationWorkspace,
    cycle: number,
    candidates: readonly LeadCandidate[]
): Promise<Lead[]> {
    const now = new Date().toISOString();
    const leads = candidates.map(
        (candidate): Lead => ({
            id: `lead-${randomUUID()}`,
            cycle,
            statement: candidate.statement,
            rationale: candidate.rationale,
            status: LeadStatus.OPEN,
            created_at: now,
            updated_at: now
        })
    );
    await workspace.update((draft) => {
        draft.leads.push(...leads);
    });
    await workspace.appendEvent(EventType.LEADS_PROPOSED, {
        cycle,
        lead_ids: leads.map(({ id }) => id)
    });
    return leads;
}

export async function startLeadResearch(
    workspace: InvestigationWorkspace,
    leadId: string
): Promise<void> {
    await workspace.update((draft) => {
        const lead = requiredById(draft.leads, leadId);
        lead.status = LeadStatus.RESEARCHING;
        lead.updated_at = new Date().toISOString();
    });
    await workspace.appendEvent(EventType.LEAD_RESEARCH_STARTED, {
        lead_id: leadId
    });
}

/**
 * Closes a lead nothing came of. The outcome is the researcher's own account, kept because the next
 * director round reads it: a lead that ran out is the only thing the investigation knows for certain.
 */
export async function exhaustLead(
    workspace: InvestigationWorkspace,
    leadId: string,
    outcome: string
): Promise<void> {
    await workspace.update((draft) => {
        const lead = requiredById(draft.leads, leadId);
        lead.status = LeadStatus.EXHAUSTED;
        lead.outcome = outcome;
        lead.updated_at = new Date().toISOString();
    });
    await workspace.appendEvent(EventType.LEAD_EXHAUSTED, {
        lead_id: leadId,
        outcome
    });
}

export async function confirmLead(
    workspace: InvestigationWorkspace,
    leadId: string,
    outcome: string
): Promise<void> {
    await workspace.update((draft) => {
        const lead = requiredById(draft.leads, leadId);
        lead.status = LeadStatus.CONFIRMED;
        lead.outcome = outcome;
        lead.updated_at = new Date().toISOString();
    });
    await workspace.appendEvent(EventType.LEAD_CONFIRMED, { lead_id: leadId });
}

export async function recordFinding(
    workspace: InvestigationWorkspace,
    input: RecordFindingInput
): Promise<Finding> {
    const finding: Finding = {
        id: `finding-${randomUUID()}`,
        lead_id: input.leadId,
        run_id: input.runId,
        claim: input.claim,
        work: input.work,
        artifact_paths: [...input.artifactPaths],
        status: FindingStatus.UNVERIFIED,
        created_at: new Date().toISOString()
    };
    await workspace.update((draft) => {
        draft.findings.push(finding);
    });
    await workspace.appendEvent(EventType.FINDING_CLAIMED, {
        finding_id: finding.id,
        lead_id: finding.lead_id,
        claim: finding.claim
    });
    return finding;
}

export async function recordVerdict(
    workspace: InvestigationWorkspace,
    finding: Finding,
    runId: string,
    outcome: { readonly confirmed: boolean; readonly reasoning: string }
): Promise<Verdict> {
    const verdict: Verdict = {
        id: `verdict-${randomUUID()}`,
        finding_id: finding.id,
        run_id: runId,
        confirmed: outcome.confirmed,
        reasoning: outcome.reasoning,
        created_at: new Date().toISOString()
    };
    await workspace.update((draft) => {
        draft.verdicts.push(verdict);
        requiredById(draft.findings, finding.id).status = outcome.confirmed
            ? FindingStatus.CONFIRMED
            : FindingStatus.REFUTED;
    });
    await workspace.appendEvent(
        outcome.confirmed ? EventType.FINDING_CONFIRMED : EventType.FINDING_REFUTED,
        { finding_id: finding.id, verdict_id: verdict.id }
    );
    return verdict;
}
