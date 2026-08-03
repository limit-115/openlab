import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import { RadioIcon } from "lucide-react";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { EventEntry } from "#src/events/event-entry";
import { EVENT_STREAM, EVENT_STREAM_TAGS, LIVE_LABEL } from "#src/events/events-panel.const";
import { SIGNAL_PULSE } from "#src/live-status/connection-badge.const";
import { Panel } from "#src/panel/panel";
import { PANEL_SCROLLER } from "#src/panel/panel.const";
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
            title="Event stream"
            description="Significant activity"
            action={
                <span className={EVENT_STREAM_TAGS}>
                    {ordered.length > 0 ? <Badge variant="outline">{ordered.length}</Badge> : null}
                    <Badge>
                        <RadioIcon className={SIGNAL_PULSE} aria-hidden="true" />
                        {LIVE_LABEL}
                    </Badge>
                </span>
            }
        >
            {ordered.length > 0 ? (
                <ol className={cn(EVENT_STREAM, PANEL_SCROLLER)}>
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
