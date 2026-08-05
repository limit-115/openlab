import type { InvestigationEvent } from "@openlab/protocol/investigation-events/investigation-event.types";
import { RadioIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { EventEntry } from "#src/events/event-entry";
import { EVENTS_NAMESPACE } from "#src/events/events.i18n";
import { EVENT_STREAM, EVENT_STREAM_TAGS } from "#src/events/events-panel.const";
import { SIGNAL_PULSE } from "#src/live-status/connection-badge.const";
import { Panel } from "#src/panel/panel";
import { PANEL_SCROLLER } from "#src/panel/panel.const";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

interface EventsPanelProps {
    events: InvestigationEvent[];
}

export function EventsPanel({ events }: EventsPanelProps) {
    const { t } = useTranslation(EVENTS_NAMESPACE);
    const ordered = [...events].sort((left, right) =>
        right.occurred_at.localeCompare(left.occurred_at)
    );

    return (
        <Panel
            title={t("title")}
            description={t("description")}
            action={
                <span className={EVENT_STREAM_TAGS}>
                    {ordered.length > 0 ? <Badge variant="outline">{ordered.length}</Badge> : null}
                    <Badge>
                        <RadioIcon className={SIGNAL_PULSE} aria-hidden="true" />
                        {t("live")}
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
                <PanelEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
            )}
        </Panel>
    );
}
