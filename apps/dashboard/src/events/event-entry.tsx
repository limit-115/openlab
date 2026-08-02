import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import {
    EVENT_ENTRY,
    EVENT_MARKER,
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
    const payload = formatEventPayload(event.payload);

    return (
        <li className={EVENT_ENTRY}>
            <time dateTime={event.occurred_at} className={EVENT_TIME}>
                {formatTime(event.occurred_at)}
            </time>
            <span className={EVENT_MARKER} aria-hidden="true" />
            <div>
                <strong className={EVENT_TYPE}>{humanizeEventType(event.type)}</strong>
                {payload ? <p className={EVENT_PAYLOAD}>{payload}</p> : null}
            </div>
        </li>
    );
}
