import type { LabEvent } from "@lab/protocol/schemas";
import { Activity, Radio } from "lucide-react";
import { EmptyState } from "#src/components/empty-state";
import { Panel } from "#src/components/panel";
import { formatEventPayload, formatTime } from "#src/lib/format";

interface EventsPanelProps {
    events: LabEvent[];
}

function humanizeEventType(type: string): string {
    return type.replaceAll(/[._-]+/g, " ");
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
                <span className="live-label">
                    <Radio size={12} aria-hidden="true" /> Live
                </span>
            }
        >
            {ordered.length > 0 ? (
                <ol className="event-list">
                    {ordered.slice(0, 20).map((event) => {
                        const payload = formatEventPayload(event.payload);

                        return (
                            <li key={event.id}>
                                <time dateTime={event.occurred_at}>
                                    {formatTime(event.occurred_at)}
                                </time>
                                <span className="event-list__marker" aria-hidden="true" />
                                <div>
                                    <strong>{humanizeEventType(event.type)}</strong>
                                    {payload ? <p>{payload}</p> : null}
                                </div>
                            </li>
                        );
                    })}
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
