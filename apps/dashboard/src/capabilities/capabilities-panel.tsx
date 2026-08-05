import { CapabilityStatus } from "@nightlab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@nightlab/protocol/capabilities/capability-request.types";
import { useTranslation } from "react-i18next";
import { CAPABILITIES_NAMESPACE } from "#src/capabilities/capabilities.i18n";
import { CAPABILITY_LIST } from "#src/capabilities/capabilities-panel.const";
import { CapabilityCard } from "#src/capabilities/capability-card";

interface CapabilitiesPanelProps {
    investigationId: string;
    requests: CapabilityRequest[];
}

/**
 * Nothing is drawn while the investigation has everything it needs. A panel saying so would take the place a
 * real request has to be noticed in, and there is no news in an investigation that is not blocked.
 */
export function CapabilitiesPanel({ investigationId, requests }: CapabilitiesPanelProps) {
    const { t } = useTranslation(CAPABILITIES_NAMESPACE);

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
        <ul className={CAPABILITY_LIST} aria-label={t("requests")}>
            {ordered.map((request) => (
                <li key={request.id}>
                    <CapabilityCard investigationId={investigationId} request={request} />
                </li>
            ))}
        </ul>
    );
}
