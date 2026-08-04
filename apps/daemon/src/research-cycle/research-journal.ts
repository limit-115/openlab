import { randomUUID } from "node:crypto";
import type { Assumption } from "@lab/protocol/assumptions/assumption.types";
import { AssumptionStatus } from "@lab/protocol/assumptions/assumption-status.const";
import type { Finding } from "@lab/protocol/findings/finding.types";
import { FindingStatus } from "@lab/protocol/findings/finding-status.const";
import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import type { Verdict } from "@lab/protocol/verdicts/verdict.types";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { requiredById } from "#src/investigation-workspace/snapshot-entities";
import type { AssumptionCandidate } from "#src/research-contract/research-contract";
import type { RecordFindingInput } from "#src/research-cycle/research-journal.types";

export async function recordAssumptions(
    workspace: InvestigationWorkspace,
    cycle: number,
    candidates: readonly AssumptionCandidate[]
): Promise<Assumption[]> {
    const now = new Date().toISOString();
    const assumptions = candidates.map(
        (candidate): Assumption => ({
            id: `assumption-${randomUUID()}`,
            cycle,
            statement: candidate.statement,
            rationale: candidate.rationale,
            status: AssumptionStatus.OPEN,
            created_at: now,
            updated_at: now
        })
    );
    await workspace.update((draft) => {
        draft.assumptions.push(...assumptions);
    });
    await workspace.appendEvent(EventType.ASSUMPTIONS_PROPOSED, {
        cycle,
        assumption_ids: assumptions.map(({ id }) => id)
    });
    return assumptions;
}

export async function startAssumptionResearch(
    workspace: InvestigationWorkspace,
    assumptionId: string
): Promise<void> {
    await workspace.update((draft) => {
        const assumption = requiredById(draft.assumptions, assumptionId);
        assumption.status = AssumptionStatus.RESEARCHING;
        assumption.updated_at = new Date().toISOString();
    });
    await workspace.appendEvent(EventType.ASSUMPTION_RESEARCH_STARTED, {
        assumption_id: assumptionId
    });
}

/**
 * Closes a bet nothing came of. The outcome is the researcher's own account, kept because the next
 * director round reads it: a bet that ran out is the only thing the investigation knows for certain.
 */
export async function exhaustAssumption(
    workspace: InvestigationWorkspace,
    assumptionId: string,
    outcome: string
): Promise<void> {
    await workspace.update((draft) => {
        const assumption = requiredById(draft.assumptions, assumptionId);
        assumption.status = AssumptionStatus.EXHAUSTED;
        assumption.outcome = outcome;
        assumption.updated_at = new Date().toISOString();
    });
    await workspace.appendEvent(EventType.ASSUMPTION_EXHAUSTED, {
        assumption_id: assumptionId,
        outcome
    });
}

export async function confirmAssumption(
    workspace: InvestigationWorkspace,
    assumptionId: string,
    outcome: string
): Promise<void> {
    await workspace.update((draft) => {
        const assumption = requiredById(draft.assumptions, assumptionId);
        assumption.status = AssumptionStatus.CONFIRMED;
        assumption.outcome = outcome;
        assumption.updated_at = new Date().toISOString();
    });
    await workspace.appendEvent(EventType.ASSUMPTION_CONFIRMED, { assumption_id: assumptionId });
}

export async function recordFinding(
    workspace: InvestigationWorkspace,
    input: RecordFindingInput
): Promise<Finding> {
    const finding: Finding = {
        id: `finding-${randomUUID()}`,
        assumption_id: input.assumptionId,
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
        assumption_id: finding.assumption_id,
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
