import type { InvestigationEvent } from "@lab/protocol/investigation-events/investigation-event.types";
import { useTranslation } from "react-i18next";
import { CopyButton } from "#src/clipboard/copy-button";
import {
    EVENT_BODY,
    EVENT_ENTRY,
    EVENT_HEADLINE,
    EVENT_MARKER,
    EVENT_MARKER_DOT,
    EVENT_MARKER_LINE,
    EVENT_PAYLOAD,
    EVENT_PAYLOAD_COPY,
    EVENT_TIME,
    EVENT_TYPE
} from "#src/events/event-entry.const";
import { formatEventPayload, humanizeEventType } from "#src/events/event-payload-display";
import { EVENTS_NAMESPACE } from "#src/events/events.i18n";
import { formatTime } from "#src/value-display/timestamp-display";

interface EventEntryProps {
    event: InvestigationEvent;
}

export function EventEntry({ event }: EventEntryProps) {
    const { t } = useTranslation(EVENTS_NAMESPACE);
    const { headline, detail } = formatEventPayload(event.payload);

    return (
        <li className={EVENT_ENTRY}>
            <time dateTime={event.occurred_at} className={EVENT_TIME}>
                {formatTime(event.occurred_at)}
            </time>
            <span className={EVENT_MARKER} aria-hidden="true">
                <span className={EVENT_MARKER_DOT} />
                <span className={EVENT_MARKER_LINE} />
            </span>
            <div className={EVENT_BODY}>
                <strong className={EVENT_TYPE}>{humanizeEventType(event.type)}</strong>
                {headline ? <p className={EVENT_HEADLINE}>{headline}</p> : null}
                {detail ? (
                    <div className="relative">
                        <pre className={EVENT_PAYLOAD}>{detail}</pre>
                        <CopyButton
                            value={detail}
                            label={t("copyPayload")}
                            className={EVENT_PAYLOAD_COPY}
                        />
                    </div>
                ) : null}
            </div>
        </li>
    );
}
