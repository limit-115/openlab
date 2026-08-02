import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import { ActivityIcon, RadioIcon } from "lucide-react";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { EventEntry } from "#src/events/event-entry";
import { EVENT_STREAM, EVENTS_BODY, LIVE_LABEL } from "#src/events/events-panel.const";
import { SIGNAL_PULSE } from "#src/live-status/connection-badge.const";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

interface EventsPanelProps {
    events: LabEvent[];
}

export function EventsPanel({ events }: EventsPanelProps) {
    const ordered = [...events].sort((left, right) =>
        right.occurred_at.localeCompare(left.occurred_at)
    );

    return (
        <Panel
            id="events"
            title="Event stream"
            description="Significant activity"
            icon={ActivityIcon}
            contentClassName={cn(ordered.length > 0 && EVENTS_BODY)}
            action={
                <span className={LIVE_LABEL}>
                    {ordered.length > 0 ? <Badge variant="outline">{ordered.length}</Badge> : null}
                    <RadioIcon className={cn("size-4", SIGNAL_PULSE)} aria-hidden="true" /> Live
                </span>
            }
        >
            {ordered.length > 0 ? (
                <ol className={EVENT_STREAM}>
                    {ordered.map((event) => (
                        <EventEntry key={event.id} event={event} />
                    ))}
                </ol>
            ) : (
                <PanelEmptyState
                    title="Waiting for significant events"
                    description="Research decisions, experiments and lifecycle changes will stream here."
                />
            )}
        </Panel>
    );
}
