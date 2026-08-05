import { AgentRole } from "@nightlab/protocol/agents/agent-role.const";
import { EventType } from "@nightlab/protocol/investigation-events/event-type.const";
import {
    ResearchResultSchema,
    VerificationResultSchema
} from "#src/research-contract/research-contract";
import { runAgentWithFallback } from "#src/research-cycle/agent-dispatch";
import { preferredDifferentHarnessIndex } from "#src/research-cycle/harness-roster";
import {
    confirmAssumption,
    exhaustAssumption,
    recordFinding,
    recordVerdict,
    startAssumptionResearch
} from "#src/research-cycle/research-journal";
import type {
    AssumptionResearchInput,
    AssumptionResearchResult
} from "#src/research-cycle/research-loop.types";
import { researcherPrompt, verifierPrompt } from "#src/research-prompts/research-prompts";

/**
 * Spends one bet. A researcher works on it with complete freedom; only if it comes back claiming
 * something does a verifier get involved, because there is nothing to verify otherwise.
 */
export async function researchAssumption(
    input: AssumptionResearchInput
): Promise<AssumptionResearchResult> {
    const { workspace, task, assumption, signal } = input;
    await startAssumptionResearch(workspace, assumption.id);

    const research = await runAgentWithFallback({
        workspace,
        activity: input.activity,
        available: input.available,
        ...(input.subscriptions === undefined ? {} : { subscriptions: input.subscriptions }),
        settings: input.settings,
        preferredIndex: input.preferredHarnessIndex,
        role: AgentRole.RESEARCHER,
        assumptionId: assumption.id,
        objective: assumption.statement,
        createAgentWorkspace: input.createAgentWorkspace,
        prompt: researcherPrompt(task, assumption),
        schema: ResearchResultSchema,
        ...(signal === undefined ? {} : { signal })
    });

    if (research.value.capability_blocked) {
        return {
            issues: research.capabilityRequests.map(
                ({ need }) => `Researcher capability required: ${need}`
            )
        };
    }
    if (!research.value.found || research.value.claim === undefined) {
        await exhaustAssumption(workspace, assumption.id, research.value.work);
        return { issues: [] };
    }

    const finding = await recordFinding(workspace, {
        assumptionId: assumption.id,
        runId: research.runId,
        claim: research.value.claim,
        work: research.value.work,
        artifactPaths: research.value.artifact_paths
    });

    await workspace.appendEvent(EventType.VERIFICATION_STARTED, { finding_id: finding.id });
    const verification = await runAgentWithFallback({
        workspace,
        activity: input.activity,
        available: input.available,
        ...(input.subscriptions === undefined ? {} : { subscriptions: input.subscriptions }),
        settings: input.settings,
        preferredIndex: preferredDifferentHarnessIndex(input.available, research.harness),
        role: AgentRole.VERIFIER,
        assumptionId: assumption.id,
        objective: `Check independently: ${finding.claim}`,
        createAgentWorkspace: input.createAgentWorkspace,
        prompt: verifierPrompt(task, assumption, finding),
        schema: VerificationResultSchema,
        ...(signal === undefined ? {} : { signal })
    });

    if (verification.value.capability_blocked) {
        return {
            issues: verification.capabilityRequests.map(
                ({ need }) => `Verifier capability required: ${need}`
            )
        };
    }

    const verdict = await recordVerdict(workspace, finding, verification.runId, {
        confirmed: verification.value.confirmed,
        reasoning: verification.value.reasoning
    });
    if (!verdict.confirmed) {
        await exhaustAssumption(workspace, assumption.id, verdict.reasoning);
        return { issues: [`Verifier refuted: ${finding.claim}`] };
    }

    await confirmAssumption(workspace, assumption.id, verdict.reasoning);
    return { confirmed: finding, issues: [] };
}
