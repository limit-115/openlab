import type { AgentHarness } from "@openlab/harness/agent-harness.types";
import { HarnessCapabilityError } from "@openlab/harness/harness-error";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { requestHarnessCapability } from "#src/research-cycle/agent-dispatch";
import type { AvailableHarness } from "#src/research-cycle/research-loop.types";

export async function preflightHarnesses(
    workspace: InvestigationWorkspace,
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
                    await requestHarnessCapability(workspace, error.capabilityRequest);
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
        throw new Error("No authenticated agent CLI harness is available");
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
