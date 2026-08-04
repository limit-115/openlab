import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import { CAPABILITY_LIST } from "#src/capabilities/capabilities-panel.const";
import { CapabilityCard } from "#src/capabilities/capability-card";

interface CapabilitiesPanelProps {
    requests: CapabilityRequest[];
}

/**
 * Nothing is drawn while the investigation has everything it needs. A panel saying so would take the place a
 * real request has to be noticed in, and there is no news in an investigation that is not blocked.
 */
export function CapabilitiesPanel({ requests }: CapabilitiesPanelProps) {
    if (requests.length === 0) {
        return null;
    }

    const ordered = [...requests].sort((left, right) => {
        if (left.status === right.status) {
            return right.created_at.localeCompare(left.created_at);
        }
        return left.status === CapabilityStatus.OPEN ? -1 : 1;
    });

    return (
        <ul className={CAPABILITY_LIST} aria-label="Capability requests">
            {ordered.map((request) => (
                <li key={request.id}>
                    <CapabilityCard request={request} />
                </li>
            ))}
        </ul>
    );
}
