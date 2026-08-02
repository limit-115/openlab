import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import { LockKeyholeIcon, WrenchIcon } from "lucide-react";
import {
    CAPABILITY_FOOTER,
    CAPABILITY_ICON,
    CAPABILITY_NEED,
    CAPABILITY_RESOURCE_CLASS_LABEL,
    COPY_PROVISIONING_COMMAND_LABEL,
    PROVISIONING_HINT,
    PROVISIONING_HINT_COMMAND,
    PROVISIONING_HINT_HEADER,
    PROVISIONING_HINT_LABEL,
    PROVISIONING_HINT_NOTE
} from "#src/capabilities/capability-card.const";
import { CopyButton } from "#src/clipboard/copy-button";
import { Badge } from "#src/design-system/badge";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemFooter,
    ItemHeader,
    ItemMedia,
    ItemTitle
} from "#src/design-system/item";
import { StatusTag } from "#src/status-tag/status-tag";
import { formatDate } from "#src/value-display/timestamp-display";

interface CapabilityCardProps {
    request: CapabilityRequest;
}

export function CapabilityCard({ request }: CapabilityCardProps) {
    const command = `lab provide ${request.id} <resource-reference>`;

    return (
        <Item asChild variant="outline" className="items-start">
            <li>
                <ItemMedia variant="icon" className={CAPABILITY_ICON} aria-hidden="true">
                    {request.status === CapabilityStatus.OPEN ? (
                        <LockKeyholeIcon />
                    ) : (
                        <WrenchIcon />
                    )}
                </ItemMedia>
                <ItemContent>
                    <ItemHeader>
                        <ItemTitle className={CAPABILITY_NEED}>{request.need}</ItemTitle>
                        <StatusTag status={request.status} />
                    </ItemHeader>
                    <Badge variant="outline">
                        {CAPABILITY_RESOURCE_CLASS_LABEL[request.resource_class]}
                    </Badge>
                    <ItemDescription>{request.reason}</ItemDescription>
                    <div className={PROVISIONING_HINT}>
                        <div className={PROVISIONING_HINT_HEADER}>
                            <span className={PROVISIONING_HINT_LABEL}>Provision via CLI</span>
                            <CopyButton
                                value={command}
                                label={COPY_PROVISIONING_COMMAND_LABEL}
                                className="-my-1"
                            />
                        </div>
                        <code className={PROVISIONING_HINT_COMMAND}>{command}</code>
                        <p className={PROVISIONING_HINT_NOTE}>{request.provisioning_hint}</p>
                    </div>
                    <ItemFooter className={CAPABILITY_FOOTER}>
                        Requested {formatDate(request.created_at)}
                    </ItemFooter>
                </ItemContent>
            </li>
        </Item>
    );
}
