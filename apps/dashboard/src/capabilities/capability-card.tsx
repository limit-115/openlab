import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import {
    CAPABILITY_CARD,
    CAPABILITY_CARD_OPEN,
    CAPABILITY_HEADER,
    CAPABILITY_NEED,
    CAPABILITY_PAIR_LABEL,
    CAPABILITY_PAIR_VALUE,
    CAPABILITY_PAIRS,
    CAPABILITY_RESOURCE_CLASS_LABEL,
    CAPABILITY_SETTLED,
    CAPABILITY_TAGS,
    CAPABILITY_WAITING,
    COPY_PROVISIONING_COMMAND_LABEL,
    HOW_TO_PROVIDE,
    PROVISION_VIA_CLI,
    PROVISIONING_HINT_COMMAND,
    PROVISIONING_HINT_HEADER,
    WHAT_THIS_UNBLOCKS
} from "#src/capabilities/capability-card.const";
import { CapabilityProvisionForm } from "#src/capabilities/capability-provision-form";
import { CopyButton } from "#src/clipboard/copy-button";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { useElapsedTime } from "#src/lab-header/lab-uptime";
import { StatusTag } from "#src/status-tag/status-tag";
import { formatDuration } from "#src/value-display/duration-display";
import { formatDate } from "#src/value-display/timestamp-display";

interface CapabilityCardProps {
    request: CapabilityRequest;
}

export function CapabilityCard({ request }: CapabilityCardProps) {
    const command = `lab provide ${request.id} <resource-reference>`;
    const open = request.status === CapabilityStatus.OPEN;

    return (
        <article className={cn(CAPABILITY_CARD, open && CAPABILITY_CARD_OPEN)}>
            <header className={CAPABILITY_HEADER}>
                <div className="flex min-w-0 flex-col gap-1">
                    <WaitedFor request={request} />
                    <p className={CAPABILITY_NEED}>{request.need}</p>
                </div>
                <div className={CAPABILITY_TAGS}>
                    <Badge variant="outline">
                        {CAPABILITY_RESOURCE_CLASS_LABEL[request.resource_class]}
                    </Badge>
                    <StatusTag status={request.status} />
                </div>
            </header>

            <div className={CAPABILITY_PAIRS}>
                <div className="flex min-w-0 flex-col gap-1">
                    <p className={CAPABILITY_PAIR_LABEL}>{WHAT_THIS_UNBLOCKS}</p>
                    <p className={CAPABILITY_PAIR_VALUE}>{request.reason}</p>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <p className={CAPABILITY_PAIR_LABEL}>{HOW_TO_PROVIDE}</p>
                    <p className={CAPABILITY_PAIR_VALUE}>{request.provisioning_hint}</p>
                    <div className={PROVISIONING_HINT_HEADER}>
                        <p className={CAPABILITY_PAIR_LABEL}>{PROVISION_VIA_CLI}</p>
                        <CopyButton
                            value={command}
                            label={COPY_PROVISIONING_COMMAND_LABEL}
                            className="-my-1"
                        />
                    </div>
                    <code className={PROVISIONING_HINT_COMMAND}>{command}</code>
                </div>
            </div>

            {open ? <CapabilityProvisionForm requestId={request.id} /> : null}
        </article>
    );
}

/**
 * An open request counts up, because the number an operator needs is how long a direction has been
 * standing still. A settled one only has to say when it happened.
 */
function WaitedFor({ request }: CapabilityRequestProps) {
    const waited = useElapsedTime(0, request.created_at, request.status === CapabilityStatus.OPEN);

    if (request.status === CapabilityStatus.OPEN) {
        return <p className={CAPABILITY_WAITING}>Waiting for you · {formatDuration(waited)}</p>;
    }

    return (
        <p className={CAPABILITY_SETTLED}>
            {request.provided_at === undefined
                ? `Requested ${formatDate(request.created_at)}`
                : `Provided ${formatDate(request.provided_at)}`}
        </p>
    );
}

interface CapabilityRequestProps {
    request: CapabilityRequest;
}
