import type { FrontierSnapshot } from "@lab/protocol/research-frontier/frontier-snapshot.types";
import {
    BanIcon,
    CircleCheckIcon,
    CircleHelpIcon,
    CompassIcon,
    FlaskConicalIcon
} from "lucide-react";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";
import { FrontierColumn } from "#src/research-frontier/frontier-column";
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
            title="Research frontier"
            description="Current knowledge boundary"
            icon={CompassIcon}
            action={
                <span className="text-sm whitespace-nowrap text-muted-foreground">
                    Mapped {formatDate(frontier.updated_at)}
                </span>
            }
        >
            {hasItems ? (
                <div className={FRONTIER_GRID}>
                    <FrontierColumn title="Known" icon={CircleCheckIcon} items={frontier.known} />
                    <FrontierColumn
                        title="Open questions"
                        icon={CircleHelpIcon}
                        items={frontier.open_questions}
                    />
                    <FrontierColumn title="Blockers" icon={BanIcon} items={frontier.blockers} />
                    <FrontierColumn
                        title="Next experiments"
                        icon={FlaskConicalIcon}
                        items={frontier.next_experiments}
                    />
                </div>
            ) : (
                <PanelEmptyState
                    title="Frontier is being mapped"
                    description="Known facts, open questions, blockers and next experiments will appear here."
                />
            )}
        </Panel>
    );
}
