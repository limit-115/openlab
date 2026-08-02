import type { Experiment } from "@lab/protocol/experiments/experiment.types";
import { formatDuration } from "#src/value-display/duration-display";

export function experimentDuration(experiment: Experiment): string {
    if (!experiment.started_at) {
        return "—";
    }

    const end = experiment.finished_at ? new Date(experiment.finished_at).getTime() : Date.now();
    return formatDuration(end - new Date(experiment.started_at).getTime());
}
