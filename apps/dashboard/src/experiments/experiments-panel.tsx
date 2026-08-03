import type { Experiment } from "@lab/protocol/experiments/experiment.types";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { useMemo, useState } from "react";
import { ItemGroup } from "#src/design-system/item";
import { ExperimentCard } from "#src/experiments/experiment-card";
import { EXPERIMENT_LIST } from "#src/experiments/experiment-card.const";
import { ExperimentFilterGroup } from "#src/experiments/experiment-filter";
import { ATTENTION_STATUSES, ExperimentFilter } from "#src/experiments/experiment-filter.const";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

interface ExperimentsPanelProps {
    experiments: Experiment[];
}

/**
 * The runs still worth an operator's attention. A run that succeeded is already readable inside the
 * claim it produced, so repeating it here only buries the one that is stuck.
 */
export function ExperimentsPanel({ experiments }: ExperimentsPanelProps) {
    const [filter, setFilter] = useState<ExperimentFilter>(ExperimentFilter.ATTENTION);

    const visible = useMemo(() => {
        const selected =
            filter === ExperimentFilter.ALL
                ? experiments
                : experiments.filter((experiment) =>
                      ATTENTION_STATUSES.includes(experiment.status)
                  );

        return [...selected].sort((left, right) => {
            if (left.status === ExperimentStatus.RUNNING) return -1;
            if (right.status === ExperimentStatus.RUNNING) return 1;
            return (right.started_at ?? "").localeCompare(left.started_at ?? "");
        });
    }, [experiments, filter]);

    return (
        <Panel
            title="Experiments"
            description="Live and unfinished runs"
            action={<ExperimentFilterGroup filter={filter} onSelect={setFilter} />}
        >
            {experiments.length === 0 ? (
                <PanelEmptyState
                    title="No experiments yet"
                    description="Planned and executed software experiments will be tracked here."
                />
            ) : visible.length === 0 ? (
                <PanelEmptyState
                    compact
                    title="Every run has settled"
                    description="Nothing is running, failed or cancelled. A successful run is shown inside the claim it produced."
                />
            ) : (
                <ItemGroup className={EXPERIMENT_LIST}>
                    {visible.map((experiment) => (
                        <ExperimentCard key={experiment.id} experiment={experiment} />
                    ))}
                </ItemGroup>
            )}
        </Panel>
    );
}
