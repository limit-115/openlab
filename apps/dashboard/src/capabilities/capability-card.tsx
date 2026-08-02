import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import { LockKeyhole, Wrench } from "lucide-react";
import {
    CAPABILITY_CARD,
    CAPABILITY_CARD_TONE,
    CAPABILITY_FOOTER,
    CAPABILITY_HEADER,
    CAPABILITY_ICON,
    CAPABILITY_NEED,
    CAPABILITY_REASON,
    PROVISIONING_HINT,
    PROVISIONING_HINT_COMMAND,
    PROVISIONING_HINT_LABEL,
    PROVISIONING_HINT_NOTE
} from "#src/capabilities/capability-card.const";
import { StatusTag } from "#src/status-tag/status-tag";
import { formatDate } from "#src/value-display/timestamp-display";

interface CapabilityCardProps {
    request: CapabilityRequest;
}

export function CapabilityCard({ request }: CapabilityCardProps) {
    return (
        <article className={`${CAPABILITY_CARD} ${CAPABILITY_CARD_TONE[request.status]}`}>
            <span className={CAPABILITY_ICON} aria-hidden="true">
                {request.status === CapabilityStatus.OPEN ? (
                    <LockKeyhole size={17} />
                ) : (
                    <Wrench size={17} />
                )}
            </span>
            <div className="min-w-0">
                <header className={CAPABILITY_HEADER}>
                    <strong className={CAPABILITY_NEED}>{request.need}</strong>
                    <StatusTag status={request.status} />
                </header>
                <p className={CAPABILITY_REASON}>{request.reason}</p>
                <div className={PROVISIONING_HINT}>
                    <span className={PROVISIONING_HINT_LABEL}>Provision via CLI</span>
                    <code className={PROVISIONING_HINT_COMMAND}>
                        lab provide {request.id} &lt;resource-reference&gt;
                    </code>
                    <small className={PROVISIONING_HINT_NOTE}>{request.provisioning_hint}</small>
                </div>
                <footer className={CAPABILITY_FOOTER}>
                    Requested {formatDate(request.created_at)}
                </footer>
            </div>
        </article>
    );
}
