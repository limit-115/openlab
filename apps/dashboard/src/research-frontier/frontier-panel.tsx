import type { FrontierSnapshot } from "@lab/protocol/status";
import { Ban, CircleCheck, CircleHelp, Compass, FlaskConical } from "lucide-react";
import { Panel } from "#src/panel/panel";
import { PANEL_UPDATED_AT } from "#src/panel/panel.const";
import { EmptyState } from "#src/panel/panel-empty-state";
import { FrontierColumn } from "#src/research-frontier/frontier-column";
import { FrontierTone } from "#src/research-frontier/frontier-column.const";
import { FRONTIER_GRID } from "#src/research-frontier/frontier-panel.const";
import { formatDate } from "#src/value-display/timestamp-display";

interface FrontierPanelProps {
    frontier: FrontierSnapshot;
}

export function FrontierPanel({ frontier }: FrontierPanelProps) {
    const hasItems =
        frontier.known.length +
            frontier.open_questions.length +
            frontier.blockers.length +
            frontier.next_experiments.length >
        0;

    return (
        <Panel
            id="frontier"
            title="Research frontier"
            eyebrow="Current knowledge boundary"
            icon={Compass}
            action={
                <span className={PANEL_UPDATED_AT}>Mapped {formatDate(frontier.updated_at)}</span>
            }
        >
            {hasItems ? (
                <div className={FRONTIER_GRID}>
                    <FrontierColumn
                        title="Known"
                        icon={CircleCheck}
                        items={frontier.known}
                        tone={FrontierTone.GREEN}
                    />
                    <FrontierColumn
                        title="Open questions"
                        icon={CircleHelp}
                        items={frontier.open_questions}
                        tone={FrontierTone.VIOLET}
                    />
                    <FrontierColumn
                        title="Blockers"
                        icon={Ban}
                        items={frontier.blockers}
                        tone={FrontierTone.RED}
                    />
                    <FrontierColumn
                        title="Next experiments"
                        icon={FlaskConical}
                        items={frontier.next_experiments}
                        tone={FrontierTone.AMBER}
                    />
                </div>
            ) : (
                <EmptyState
                    title="Frontier is being mapped"
                    description="Known facts, open questions, blockers and next experiments will appear here."
                />
            )}
        </Panel>
    );
}
