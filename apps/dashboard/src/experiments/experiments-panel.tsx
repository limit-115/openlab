import type { Experiment } from "@lab/protocol/experiments/experiment.types";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { MicroscopeIcon } from "lucide-react";
import { Badge } from "#src/design-system/badge";
import { ItemGroup } from "#src/design-system/item";
import { ExperimentCard } from "#src/experiments/experiment-card";
import { EXPERIMENT_LIST } from "#src/experiments/experiment-card.const";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

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
            description="Recent & running"
            icon={MicroscopeIcon}
            action={<Badge variant="outline">{experiments.length} runs</Badge>}
        >
            {ordered.length > 0 ? (
                <ItemGroup className={EXPERIMENT_LIST}>
                    {ordered.map((experiment) => (
                        <ExperimentCard key={experiment.id} experiment={experiment} />
                    ))}
                </ItemGroup>
            ) : (
                <PanelEmptyState
                    title="No experiments yet"
                    description="Planned and executed software experiments will be tracked here."
                />
            )}
        </Panel>
    );
}
