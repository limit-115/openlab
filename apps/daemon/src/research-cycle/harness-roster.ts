import { type HarnessKind, HarnessKinds } from "@lab/harness/agent-harness.const";
import type { AgentHarness } from "@lab/harness/agent-harness.types";
import { ClaudeHarness } from "@lab/harness/claude-harness";
import { CodexHarness } from "@lab/harness/codex-harness";
import { GlmHarness } from "@lab/harness/glm-harness";
import { HarnessCapabilityError } from "@lab/harness/harness-error";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { requestSubscriptionCapability } from "#src/research-cycle/agent-dispatch";
import type { AvailableHarness } from "#src/research-cycle/research-loop.types";

const HARNESS_FACTORY: Record<HarnessKind, () => AgentHarness> = {
    [HarnessKinds.CODEX]: () => new CodexHarness(),
    [HarnessKinds.CLAUDE]: () => new ClaudeHarness(),
    [HarnessKinds.GLM]: () => new GlmHarness()
};

/** Builds the roster a run rotates through, in the order the operator asked for. */
export function createHarnesses(kinds: readonly HarnessKind[]): AgentHarness[] {
    return kinds.map((kind) => HARNESS_FACTORY[kind]());
}

export async function preflightHarnesses(
    workspace: LabWorkspace,
    harnesses: readonly AgentHarness[],
    signal?: AbortSignal
): Promise<AvailableHarness[]> {
    const results = await Promise.all(
        harnesses.map(async (harness): Promise<AvailableHarness | undefined> => {
            try {
                const preflight = await harness.preflight(signal);
                await workspace.appendEvent(EventType.HARNESS_PREFLIGHT_SUCCEEDED, {
                    harness: harness.kind,
                    cli_version: preflight.cliVersion,
                    authentication_method: preflight.authentication.method,
                    subscription: preflight.authentication.subscription
                });
                return { harness, preflight };
            } catch (error) {
                if (signal?.aborted) {
                    throw error;
                }
                await workspace.appendEvent(EventType.HARNESS_PREFLIGHT_FAILED, {
                    harness: harness.kind,
                    error: error instanceof Error ? error.message : String(error)
                });
                if (error instanceof HarnessCapabilityError) {
                    await requestSubscriptionCapability(workspace, error.capabilityRequest);
                }
                return undefined;
            }
        })
    );
    return results.filter((result): result is AvailableHarness => result !== undefined);
}

export function selectHarness(
    available: readonly AvailableHarness[],
    index: number
): AvailableHarness {
    const selected = available[index % available.length];
    if (selected === undefined) {
        throw new Error("No subscription-authenticated harness is available");
    }
    return selected;
}

/** Keeps a verifier off the harness that produced the claim, when the roster allows it. */
export function preferredDifferentHarnessIndex(
    available: readonly AvailableHarness[],
    used: AgentHarness
): number {
    const index = available.findIndex(({ harness }) => harness.kind !== used.kind);
    return index < 0 ? 0 : index;
}
