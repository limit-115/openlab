import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import { Activity, Radio } from "lucide-react";
import { EventEntry } from "#src/events/event-entry";
import { LIVE_LABEL } from "#src/events/events-panel.const";
import { SIGNAL_PULSE } from "#src/live-status/connection-badge.const";
import { Panel } from "#src/panel/panel";
import { EmptyState } from "#src/panel/panel-empty-state";

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
            eyebrow="Significant activity"
            icon={Activity}
            action={
                <span className={LIVE_LABEL}>
                    <Radio size={12} className={SIGNAL_PULSE} aria-hidden="true" /> Live
                </span>
            }
        >
            {ordered.length > 0 ? (
                <ol>
                    {ordered.slice(0, 20).map((event) => (
                        <EventEntry key={event.id} event={event} />
                    ))}
                </ol>
            ) : (
                <EmptyState
                    title="Waiting for significant events"
                    description="Research decisions, experiments and lifecycle changes will stream here."
                />
            )}
        </Panel>
    );
}
