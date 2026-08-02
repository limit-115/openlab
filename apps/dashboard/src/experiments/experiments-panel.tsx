import type { Experiment } from "@lab/protocol/experiments/experiment.types";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { Microscope } from "lucide-react";
import { ExperimentCard } from "#src/experiments/experiment-card";
import { EXPERIMENT_LIST } from "#src/experiments/experiment-card.const";
import { Panel } from "#src/panel/panel";
import { PANEL_COUNT_BADGE } from "#src/panel/panel.const";
import { EmptyState } from "#src/panel/panel-empty-state";

interface ExperimentsPanelProps {
    experiments: Experiment[];
}

export function ExperimentsPanel({ experiments }: ExperimentsPanelProps) {
    const ordered = [...experiments].sort((left, right) => {
        if (left.status === ExperimentStatus.RUNNING) return -1;
        if (right.status === ExperimentStatus.RUNNING) return 1;
        return (right.started_at ?? "").localeCompare(left.started_at ?? "");
    });

    return (
        <Panel
            title="Experiments"
            eyebrow="Recent & running"
            icon={Microscope}
            action={<span className={PANEL_COUNT_BADGE}>{experiments.length} runs</span>}
        >
            {ordered.length > 0 ? (
                <div className={EXPERIMENT_LIST}>
                    {ordered.slice(0, 8).map((experiment) => (
                        <ExperimentCard key={experiment.id} experiment={experiment} />
                    ))}
                </div>
            ) : (
                <EmptyState
                    title="No experiments yet"
                    description="Planned and executed software experiments will be tracked here."
                />
            )}
        </Panel>
    );
}
