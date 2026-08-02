import type { FrontierSnapshot } from "@lab/protocol/status";
import { Ban, CircleCheck, CircleHelp, Compass, FlaskConical } from "lucide-react";
import { EmptyState } from "#src/components/empty-state";
import { Panel } from "#src/components/panel";
import { formatDate } from "#src/lib/format";

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
            action={<span className="updated-at">Mapped {formatDate(frontier.updated_at)}</span>}
        >
            {hasItems ? (
                <div className="frontier-grid">
                    <FrontierColumn
                        title="Known"
                        icon={CircleCheck}
                        items={frontier.known}
                        tone="green"
                    />
                    <FrontierColumn
                        title="Open questions"
                        icon={CircleHelp}
                        items={frontier.open_questions}
                        tone="violet"
                    />
                    <FrontierColumn
                        title="Blockers"
                        icon={Ban}
                        items={frontier.blockers}
                        tone="red"
                    />
                    <FrontierColumn
                        title="Next experiments"
                        icon={FlaskConical}
                        items={frontier.next_experiments}
                        tone="amber"
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

interface FrontierColumnProps {
    title: string;
    icon: typeof CircleCheck;
    items: string[];
    tone: string;
}

function FrontierColumn({ title, icon: Icon, items, tone }: FrontierColumnProps) {
    return (
        <article className={`frontier-column frontier-column--${tone}`}>
            <header>
                <Icon size={15} aria-hidden="true" />
                <h3>{title}</h3>
                <span>{items.length}</span>
            </header>
            {items.length > 0 ? (
                <ul>
                    {items.map((item, index) => (
                        <li key={`${title}-${index.toString()}`}>{item}</li>
                    ))}
                </ul>
            ) : (
                <p className="quiet">Nothing recorded</p>
            )}
        </article>
    );
}
