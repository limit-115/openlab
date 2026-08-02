import { CapabilityStatus, ClaimStatus, EventType } from "@lab/protocol/constants";
import type { CapabilityRequest, Claim, TaskInput } from "@lab/protocol/schemas";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import {
    ResearchContextEntryType,
    ResearchContextPrefix
} from "#src/research-cycle/research-frontier.const";
import { uniqueStrings } from "#src/research-cycle/unique-strings";

export async function updateFrontier(
    workspace: LabWorkspace,
    known: readonly string[],
    nextExperiments: readonly string[],
    blockers: readonly string[]
): Promise<void> {
    await workspace.update((draft) => {
        draft.frontier.known = uniqueStrings([...draft.frontier.known, ...known]);
        draft.frontier.open_questions = uniqueStrings([
            ...draft.claims
                .filter(
                    ({ status }) =>
                        status === ClaimStatus.PROPOSED || status === ClaimStatus.TESTING
                )
                .map(({ statement }) => statement)
        ]);
        draft.frontier.blockers = uniqueStrings([
            ...draft.frontier.blockers,
            ...blockers.filter((blocker) => blocker.trim().length > 0)
        ]);
        draft.frontier.next_experiments = uniqueStrings(nextExperiments);
    });
    await workspace.appendEvent(EventType.FRONTIER_UPDATED, {
        next_experiments: nextExperiments.length,
        blockers: blockers.length
    });
}

export function taskForCycle(task: TaskInput, workspace: LabWorkspace, cycle: number): TaskInput {
    const snapshot = workspace.getSnapshot();
    const capabilityContext = snapshot.capability_requests
        .filter(({ status }) => status === CapabilityStatus.PROVIDED)
        .sort(
            (left, right) =>
                requiredProvidedAt(left).localeCompare(requiredProvidedAt(right)) ||
                left.id.localeCompare(right.id)
        )
        .map(providedCapabilityContext);
    const frontierContext =
        cycle === 0
            ? []
            : [
                  ...snapshot.frontier.known,
                  ...snapshot.frontier.open_questions.map((question) =>
                      JSON.stringify({
                          type: ResearchContextEntryType.OPEN_QUESTION,
                          question
                      })
                  ),
                  ...snapshot.frontier.blockers.map((blocker) =>
                      JSON.stringify({
                          type: ResearchContextEntryType.BLOCKER,
                          blocker
                      })
                  ),
                  ...snapshot.claims.filter(isOpenClaim).map((claim) =>
                      JSON.stringify({
                          type: ResearchContextEntryType.OPEN_CLAIM,
                          claim_id: claim.id,
                          statement: claim.statement,
                          status: claim.status
                      })
                  ),
                  ...snapshot.frontier.next_experiments.map(
                      (experiment) => `${ResearchContextPrefix.NEXT_EXPERIMENT} ${experiment}`
                  )
              ];
    return {
        ...task,
        context: uniqueStrings([...task.context, ...capabilityContext, ...frontierContext])
    };
}

function isOpenClaim(claim: Claim): boolean {
    return (
        claim.status === ClaimStatus.PROPOSED ||
        claim.status === ClaimStatus.TESTING ||
        claim.status === ClaimStatus.SUPPORTED
    );
}

function providedCapabilityContext(request: CapabilityRequest): string {
    return JSON.stringify({
        type: ResearchContextEntryType.PROVIDED_CAPABILITY,
        resource_reference: requiredResourceReference(request),
        provided_at: requiredProvidedAt(request)
    });
}

function requiredResourceReference(request: CapabilityRequest): string {
    if (request.resource_reference === undefined) {
        throw new Error(`Provided capability ${request.id} has no resource reference`);
    }
    return request.resource_reference;
}

function requiredProvidedAt(request: CapabilityRequest): string {
    if (request.provided_at === undefined) {
        throw new Error(`Provided capability ${request.id} has no provided timestamp`);
    }
    return request.provided_at;
}
