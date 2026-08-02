import {
    DiagnosedFailurePattern,
    DormantCapabilityPolicyDecision,
    DormantCapabilityPolicyReason,
    MutationActionPattern,
    ProtectedLabComponent,
    ProtectedLabComponentPattern
} from "#src/research-contract/director-direction-policy.const";
import type {
    DirectorDirectionCandidate,
    DormantCapabilityPolicyContext,
    DormantCapabilityPolicyResult
} from "#src/research-contract/director-direction-policy.types";

export function evaluateDormantCapabilityDirection(
    direction: DirectorDirectionCandidate,
    context: DormantCapabilityPolicyContext
): DormantCapabilityPolicyResult {
    const directionText = directionTextContent(direction);
    const protectedComponents = detectProtectedLabComponents(directionText);
    if (protectedComponents.size === 0 || !MutationActionPattern.test(directionText)) {
        return { decision: DormantCapabilityPolicyDecision.ALLOW };
    }

    if (
        context.recovered &&
        context.frontierBlockers.some((blocker) =>
            isDiagnosedBlockerForComponent(blocker, protectedComponents)
        )
    ) {
        return { decision: DormantCapabilityPolicyDecision.ALLOW };
    }

    return {
        decision: DormantCapabilityPolicyDecision.DENY,
        reason: DormantCapabilityPolicyReason.UNDIAGNOSED_CONTROL_PLANE_MUTATION
    };
}

function directionTextContent(direction: DirectorDirectionCandidate): string {
    return [direction.title, direction.approach, direction.rationale, direction.objective].join(
        "\n"
    );
}

function detectProtectedLabComponents(value: string): ReadonlySet<ProtectedLabComponent> {
    const components = new Set<ProtectedLabComponent>();
    for (const component of Object.values(ProtectedLabComponent)) {
        if (ProtectedLabComponentPattern[component].some((pattern) => pattern.test(value))) {
            components.add(component);
        }
    }
    return components;
}

function isDiagnosedBlockerForComponent(
    blocker: string,
    protectedComponents: ReadonlySet<ProtectedLabComponent>
): boolean {
    if (!DiagnosedFailurePattern.test(blocker)) {
        return false;
    }
    const blockerComponents = detectProtectedLabComponents(blocker);
    return [...protectedComponents].some((component) => blockerComponents.has(component));
}
