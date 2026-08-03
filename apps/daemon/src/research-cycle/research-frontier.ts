import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import type { Claim } from "@lab/protocol/claims/claim.types";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
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
        .filter(({ status }) => status === CapabilityStatus.ANSWERED)
        .sort(
            (left, right) =>
                requiredAnsweredAt(left).localeCompare(requiredAnsweredAt(right)) ||
                left.id.localeCompare(right.id)
        )
        .map(answeredCapabilityContext);
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

/**
 * Every answer reaches the next cycle, not only the ones that handed something over. A refusal is
 * the reply an agent most needs to read, because it is what stops the same ask coming back.
 */
function answeredCapabilityContext(request: CapabilityRequest): string {
    return JSON.stringify({
        type: ResearchContextEntryType.ANSWERED_CAPABILITY,
        need: request.need,
        answer: requiredAnswer(request),
        answered_at: requiredAnsweredAt(request)
    });
}

function requiredAnswer(request: CapabilityRequest): string {
    if (request.answer === undefined) {
        throw new Error(`Answered capability ${request.id} has no answer`);
    }
    return request.answer;
}

function requiredAnsweredAt(request: CapabilityRequest): string {
    if (request.answered_at === undefined) {
        throw new Error(`Answered capability ${request.id} has no answer timestamp`);
    }
    return request.answered_at;
}
