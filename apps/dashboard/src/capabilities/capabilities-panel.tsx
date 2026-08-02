import { CapabilityStatus } from "@lab/protocol/constants";
import type { CapabilityRequest } from "@lab/protocol/schemas";
import { KeyRound } from "lucide-react";
import { CapabilityCard } from "#src/capabilities/capability-card";
import { CAPABILITY_LIST } from "#src/capabilities/capability-card.const";
import { Panel } from "#src/panel/panel";
import { PANEL_COUNT_BADGE_ALERT } from "#src/panel/panel.const";
import { EmptyState } from "#src/panel/panel-empty-state";

interface CapabilitiesPanelProps {
    requests: CapabilityRequest[];
}

export function CapabilitiesPanel({ requests }: CapabilitiesPanelProps) {
    const openCount = requests.filter((request) => request.status === CapabilityStatus.OPEN).length;

    return (
        <Panel
            title="Capabilities"
            eyebrow="External blockers"
            icon={KeyRound}
            action={
                openCount > 0 ? (
                    <span className={PANEL_COUNT_BADGE_ALERT}>{openCount} needed</span>
                ) : null
            }
        >
            {requests.length > 0 ? (
                <div className={CAPABILITY_LIST}>
                    {requests.map((request) => (
                        <CapabilityCard key={request.id} request={request} />
                    ))}
                </div>
            ) : (
                <EmptyState
                    compact
                    title="All capabilities available"
                    description="There are no access, tool or infrastructure requests."
                />
            )}
        </Panel>
    );
}
