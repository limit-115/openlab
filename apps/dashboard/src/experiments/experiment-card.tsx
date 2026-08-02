import { ExperimentStatus } from "@lab/protocol/constants";
import type { Experiment } from "@lab/protocol/schemas";
import { CircleCheck, CircleX, Clock3, Play, TerminalSquare } from "lucide-react";
import {
    EXPERIMENT_CARD,
    EXPERIMENT_COMMAND,
    EXPERIMENT_COMMAND_TEXT,
    EXPERIMENT_FOOTER,
    EXPERIMENT_HEADER,
    EXPERIMENT_HYPOTHESIS,
    EXPERIMENT_STATUS,
    EXPERIMENT_STATUS_TONE
} from "#src/experiments/experiment-card.const";
import { experimentDuration } from "#src/experiments/experiment-duration";
import { StatusTag } from "#src/status-tag/status-tag";
import { formatIdentifier } from "#src/value-display/identifier-display";
import { formatDate } from "#src/value-display/timestamp-display";

function ExperimentIcon({ status }: { status: ExperimentStatus }) {
    if (status === ExperimentStatus.RUNNING) {
        return <Play size={14} fill="currentColor" aria-hidden="true" />;
    }
    if (status === ExperimentStatus.SUCCEEDED) {
        return <CircleCheck size={14} aria-hidden="true" />;
    }
    if (
        status === ExperimentStatus.FAILED ||
        status === ExperimentStatus.TIMED_OUT ||
        status === ExperimentStatus.CANCELLED
    ) {
        return <CircleX size={14} aria-hidden="true" />;
    }
    return <Clock3 size={14} aria-hidden="true" />;
}

interface ExperimentCardProps {
    experiment: Experiment;
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
    return (
        <article className={EXPERIMENT_CARD}>
            <span className={`${EXPERIMENT_STATUS} ${EXPERIMENT_STATUS_TONE[experiment.status]}`}>
                <ExperimentIcon status={experiment.status} />
            </span>
            <div className="min-w-0">
                <header className={EXPERIMENT_HEADER}>
                    <strong className={EXPERIMENT_HYPOTHESIS}>{experiment.hypothesis}</strong>
                    <StatusTag
                        status={experiment.status}
                        label={experiment.status.replace("_", " ")}
                    />
                </header>
                <p className={EXPERIMENT_COMMAND}>
                    <TerminalSquare size={13} className="flex-none" aria-hidden="true" />
                    <code className={EXPERIMENT_COMMAND_TEXT}>{experiment.command}</code>
                </p>
                <footer className={EXPERIMENT_FOOTER}>
                    <span title={experiment.id}>{formatIdentifier(experiment.id)}</span>
                    <span>Started {formatDate(experiment.started_at)}</span>
                    <span>{experimentDuration(experiment)}</span>
                    {experiment.exit_code !== undefined ? (
                        <span>Exit {experiment.exit_code ?? "—"}</span>
                    ) : null}
                </footer>
            </div>
        </article>
    );
}
