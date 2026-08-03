import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import { CapabilityAnswerForm } from "#src/capabilities/capability-answer-form";
import {
    BLOCKING_LABEL,
    CAPABILITY_CARD,
    CAPABILITY_CARD_OPEN,
    CAPABILITY_HEADER,
    CAPABILITY_NEED,
    CAPABILITY_PAIR_LABEL,
    CAPABILITY_PAIR_VALUE,
    CAPABILITY_PAIRS,
    CAPABILITY_SETTLED,
    CAPABILITY_TAGS,
    CAPABILITY_WAITING,
    COPY_PROVISIONING_COMMAND_LABEL,
    HOW_TO_PROVIDE,
    NOTHING_TRIED,
    PROVISION_VIA_CLI,
    PROVISIONING_HINT_COMMAND,
    PROVISIONING_HINT_HEADER,
    WHAT_IT_TRIED,
    WHAT_THIS_UNBLOCKS,
    YOUR_ANSWER
} from "#src/capabilities/capability-card.const";
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
    const command = `lab answer ${request.id} <answer>`;
    const open = request.status === CapabilityStatus.OPEN;

    return (
        <article className={cn(CAPABILITY_CARD, open && CAPABILITY_CARD_OPEN)}>
            <header className={CAPABILITY_HEADER}>
                <div className="flex min-w-0 flex-col gap-1">
                    <WaitedFor request={request} />
                    <p className={CAPABILITY_NEED}>{request.need}</p>
                </div>
                <div className={CAPABILITY_TAGS}>
                    {request.blocking ? (
                        <Badge variant="destructive">{BLOCKING_LABEL}</Badge>
                    ) : null}
                    <StatusTag status={request.status} />
                </div>
            </header>

            <div className={CAPABILITY_PAIRS}>
                <div className="flex min-w-0 flex-col gap-1">
                    <p className={CAPABILITY_PAIR_LABEL}>{WHAT_THIS_UNBLOCKS}</p>
                    <p className={CAPABILITY_PAIR_VALUE}>{request.reason}</p>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <p className={CAPABILITY_PAIR_LABEL}>{WHAT_IT_TRIED}</p>
                    <p className={CAPABILITY_PAIR_VALUE}>
                        {request.self_provisioning_attempt ?? NOTHING_TRIED}
                    </p>
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
                {request.answer === undefined ? null : (
                    <div className="flex min-w-0 flex-col gap-1">
                        <p className={CAPABILITY_PAIR_LABEL}>{YOUR_ANSWER}</p>
                        <p className={CAPABILITY_PAIR_VALUE}>{request.answer}</p>
                    </div>
                )}
            </div>

            {open ? <CapabilityAnswerForm requestId={request.id} /> : null}
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
            {request.answered_at === undefined
                ? `Requested ${formatDate(request.created_at)}`
                : `Answered ${formatDate(request.answered_at)}`}
        </p>
    );
}

interface CapabilityRequestProps {
    request: CapabilityRequest;
}
