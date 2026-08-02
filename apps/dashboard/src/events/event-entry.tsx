import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import { CopyButton } from "#src/clipboard/copy-button";
import {
    COPY_EVENT_PAYLOAD_LABEL,
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
import { formatTime } from "#src/value-display/timestamp-display";

interface EventEntryProps {
    event: LabEvent;
}

export function EventEntry({ event }: EventEntryProps) {
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
                            label={COPY_EVENT_PAYLOAD_LABEL}
                            className={EVENT_PAYLOAD_COPY}
                        />
                    </div>
                ) : null}
            </div>
        </li>
    );
}
