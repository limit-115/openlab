import { ToggleGroup, ToggleGroupItem } from "#src/design-system/toggle-group";
import {
    EXPERIMENT_FILTER_SCROLLER,
    EXPERIMENT_FILTERS,
    type ExperimentFilter
} from "#src/experiments/experiment-filter.const";

interface ExperimentFilterGroupProps {
    filter: ExperimentFilter;
    onSelect: (filter: ExperimentFilter) => void;
}

export function ExperimentFilterGroup({ filter, onSelect }: ExperimentFilterGroupProps) {
    return (
        <div className={EXPERIMENT_FILTER_SCROLLER}>
            <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                spacing={0}
                value={filter}
                aria-label="Filter runs"
                onValueChange={(value) => {
                    if (value) {
                        onSelect(value as ExperimentFilter);
                    }
                }}
            >
                {EXPERIMENT_FILTERS.map((item) => (
                    <ToggleGroupItem key={item.value} value={item.value}>
                        {item.label}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
        </div>
    );
}
