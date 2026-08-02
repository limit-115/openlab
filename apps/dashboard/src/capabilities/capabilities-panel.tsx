import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import { KeyRoundIcon } from "lucide-react";
import { CapabilityCard } from "#src/capabilities/capability-card";
import { Badge } from "#src/design-system/badge";
import { ItemGroup } from "#src/design-system/item";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

interface CapabilitiesPanelProps {
    requests: CapabilityRequest[];
}

export function CapabilitiesPanel({ requests }: CapabilitiesPanelProps) {
    const openCount = requests.filter((request) => request.status === CapabilityStatus.OPEN).length;

    return (
        <Panel
            title="Capabilities"
            description="External blockers"
            icon={KeyRoundIcon}
            action={openCount > 0 ? <Badge>{openCount} needed</Badge> : null}
        >
            {requests.length > 0 ? (
                <ItemGroup className="gap-3">
                    {requests.map((request) => (
                        <CapabilityCard key={request.id} request={request} />
                    ))}
                </ItemGroup>
            ) : (
                <PanelEmptyState
                    compact
                    title="All capabilities available"
                    description="No credential, account, private data, hardware or authorization is waiting on the operator."
                />
            )}
        </Panel>
    );
}
