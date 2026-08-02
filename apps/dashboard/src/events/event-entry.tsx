import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import {
    EVENT_ENTRY,
    EVENT_HEADLINE,
    EVENT_MARKER,
    EVENT_MARKER_DOT,
    EVENT_MARKER_LINE,
    EVENT_PAYLOAD,
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
            <strong className={EVENT_TYPE}>{humanizeEventType(event.type)}</strong>
            <div>
                {headline ? <p className={EVENT_HEADLINE}>{headline}</p> : null}
                {detail ? <pre className={EVENT_PAYLOAD}>{detail}</pre> : null}
            </div>
        </li>
    );
}
