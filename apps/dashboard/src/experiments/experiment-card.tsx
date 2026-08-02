import type { Experiment } from "@lab/protocol/experiments/experiment.types";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import {
    CircleCheckIcon,
    CircleXIcon,
    Clock3Icon,
    PlayIcon,
    TerminalSquareIcon
} from "lucide-react";
import { cn } from "#src/design-system/class-names";
import {
    Item,
    ItemContent,
    ItemFooter,
    ItemHeader,
    ItemMedia,
    ItemTitle
} from "#src/design-system/item";
import {
    EXPERIMENT_COMMAND,
    EXPERIMENT_COMMAND_TEXT,
    EXPERIMENT_ERROR,
    EXPERIMENT_FOOTER,
    EXPERIMENT_HYPOTHESIS,
    EXPERIMENT_OUTPUT_PATH,
    EXPERIMENT_STATUS,
    EXPERIMENT_STATUS_TONE
} from "#src/experiments/experiment-card.const";
import { experimentDuration } from "#src/experiments/experiment-duration";
import { StatusTag } from "#src/status-tag/status-tag";
import { formatDate } from "#src/value-display/timestamp-display";

function ExperimentIcon({ status }: { status: ExperimentStatus }) {
    if (status === ExperimentStatus.RUNNING) {
        return <PlayIcon fill="currentColor" aria-hidden="true" />;
    }
    if (status === ExperimentStatus.SUCCEEDED) {
        return <CircleCheckIcon aria-hidden="true" />;
    }
    if (
        status === ExperimentStatus.FAILED ||
        status === ExperimentStatus.TIMED_OUT ||
        status === ExperimentStatus.CANCELLED
    ) {
        return <CircleXIcon aria-hidden="true" />;
    }
    return <Clock3Icon aria-hidden="true" />;
}

interface ExperimentCardProps {
    experiment: Experiment;
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
    return (
        <Item asChild variant="outline" className="items-start">
            <li>
                <ItemMedia
                    variant="icon"
                    className={cn(EXPERIMENT_STATUS, EXPERIMENT_STATUS_TONE[experiment.status])}
                >
                    <ExperimentIcon status={experiment.status} />
                </ItemMedia>
                <ItemContent>
                    <ItemHeader>
                        <ItemTitle className={EXPERIMENT_HYPOTHESIS}>
                            {experiment.hypothesis}
                        </ItemTitle>
                        <StatusTag
                            status={experiment.status}
                            label={experiment.status.replace("_", " ")}
                        />
                    </ItemHeader>
                    <p className={EXPERIMENT_COMMAND}>
                        <TerminalSquareIcon
                            className="size-4 flex-none text-muted-foreground"
                            aria-hidden="true"
                        />
                        <code className={EXPERIMENT_COMMAND_TEXT}>{experiment.command}</code>
                    </p>
                    {experiment.error === undefined ? null : (
                        <p className={EXPERIMENT_ERROR}>{experiment.error}</p>
                    )}
                    {experiment.output_path === undefined ? null : (
                        <p className={EXPERIMENT_OUTPUT_PATH}>{experiment.output_path}</p>
                    )}
                    <ItemFooter className={EXPERIMENT_FOOTER}>
                        <span>{experiment.id}</span>
                        <span>{experiment.evaluator}</span>
                        <span>Started {formatDate(experiment.started_at)}</span>
                        <span>{experimentDuration(experiment)}</span>
                        {experiment.exit_code !== undefined ? (
                            <span>Exit {experiment.exit_code ?? "—"}</span>
                        ) : null}
                    </ItemFooter>
                </ItemContent>
            </li>
        </Item>
    );
}
