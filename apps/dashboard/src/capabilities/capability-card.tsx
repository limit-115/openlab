import { CapabilityStatus } from "@openlab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@openlab/protocol/capabilities/capability-request.types";
import { useTranslation } from "react-i18next";
import { CAPABILITIES_NAMESPACE } from "#src/capabilities/capabilities.i18n";
import { CapabilityAnswerForm } from "#src/capabilities/capability-answer-form";
import {
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
    PROVISIONING_HINT_COMMAND,
    PROVISIONING_HINT_HEADER
} from "#src/capabilities/capability-card.const";
import { CopyButton } from "#src/clipboard/copy-button";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { useElapsedTime } from "#src/investigation-header/elapsed-time";
import { StatusTag } from "#src/status-tag/status-tag";
import { formatDuration } from "#src/value-display/duration-display";
import { formatDate } from "#src/value-display/timestamp-display";

interface CapabilityCardProps {
    investigationId: string;
    request: CapabilityRequest;
}

export function CapabilityCard({ investigationId, request }: CapabilityCardProps) {
    const { t } = useTranslation(CAPABILITIES_NAMESPACE);
    const command = `nightlab answer ${request.id} <answer>`;
    const open = request.status === CapabilityStatus.OPEN;

    return (
        <article className={cn(CAPABILITY_CARD, open && CAPABILITY_CARD_OPEN)}>
            <header className={CAPABILITY_HEADER}>
                <div className="flex min-w-0 flex-col gap-1">
                    <WaitedFor request={request} />
                    <p className={CAPABILITY_NEED}>{request.need}</p>
                </div>
                <div className={CAPABILITY_TAGS}>
                    {request.blocking ? <Badge variant="destructive">{t("blocking")}</Badge> : null}
                    <StatusTag status={request.status} />
                </div>
            </header>

            <div className={CAPABILITY_PAIRS}>
                <div className="flex min-w-0 flex-col gap-1">
                    <p className={CAPABILITY_PAIR_LABEL}>{t("unblocks")}</p>
                    <p className={CAPABILITY_PAIR_VALUE}>{request.reason}</p>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <p className={CAPABILITY_PAIR_LABEL}>{t("whatItTried")}</p>
                    <p className={CAPABILITY_PAIR_VALUE}>
                        {request.self_provisioning_attempt ?? t("nothingTried")}
                    </p>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <p className={CAPABILITY_PAIR_LABEL}>{t("howToProvide")}</p>
                    <p className={CAPABILITY_PAIR_VALUE}>{request.provisioning_hint}</p>
                    <div className={PROVISIONING_HINT_HEADER}>
                        <p className={CAPABILITY_PAIR_LABEL}>{t("viaCli")}</p>
                        <CopyButton value={command} label={t("copyCommand")} className="-my-1" />
                    </div>
                    <code className={PROVISIONING_HINT_COMMAND}>{command}</code>
                </div>
                {request.answer === undefined ? null : (
                    <div className="flex min-w-0 flex-col gap-1">
                        <p className={CAPABILITY_PAIR_LABEL}>{t("yourAnswer")}</p>
                        <p className={CAPABILITY_PAIR_VALUE}>{request.answer}</p>
                    </div>
                )}
            </div>

            {open ? (
                <CapabilityAnswerForm investigationId={investigationId} requestId={request.id} />
            ) : null}
        </article>
    );
}

/**
 * An open request counts up, because the number an operator needs is how long a direction has been
 * standing still. A settled one only has to say when it happened.
 */
function WaitedFor({ request }: CapabilityRequestProps) {
    const { t } = useTranslation(CAPABILITIES_NAMESPACE);
    const waited = useElapsedTime(0, request.created_at, request.status === CapabilityStatus.OPEN);

    if (request.status === CapabilityStatus.OPEN) {
        return (
            <p className={CAPABILITY_WAITING}>{t("waiting", { waited: formatDuration(waited) })}</p>
        );
    }

    return (
        <p className={CAPABILITY_SETTLED}>
            {request.answered_at === undefined
                ? t("requested", { at: formatDate(request.created_at) })
                : t("answered", { at: formatDate(request.answered_at) })}
        </p>
    );
}

interface CapabilityRequestProps {
    request: CapabilityRequest;
}
