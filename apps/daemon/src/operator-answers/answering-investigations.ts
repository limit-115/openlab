import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import type { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import type {
    AnsweringInvestigations,
    OpenCapability
} from "#src/operator-answers/operator-answers.types";

/**
 * The lab's held investigations, as somewhere an answer can land. A chat belongs to the operator
 * rather than to any one investigation, so what is offered is every request the lab is waiting on
 * at once — which is also what makes "there is only one open question" a fact worth acting on.
 */
export function investigationsAnswering(registry: InvestigationRegistry): AnsweringInvestigations {
    return {
        openCapabilities(): readonly OpenCapability[] {
            return registry.list().flatMap(({ id }) => {
                const held = registry.get(id);
                if (held === undefined) {
                    return [];
                }
                return held.workspace
                    .getSnapshot()
                    .capability_requests.filter(
                        (request) => request.status === CapabilityStatus.OPEN
                    )
                    .map((request) => ({
                        investigationId: id,
                        capabilityId: request.id,
                        need: request.need
                    }));
            });
        },

        async answerCapability(
            investigationId: string,
            capabilityId: string,
            answer: string
        ): Promise<boolean> {
            const held = registry.get(investigationId);
            if (held === undefined) {
                return false;
            }
            return held.workspace.answerCapability(capabilityId, answer);
        }
    };
}
