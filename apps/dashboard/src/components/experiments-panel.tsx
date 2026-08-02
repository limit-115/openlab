import type { Experiment } from "@lab/protocol/schemas";
import { CircleCheck, CircleX, Clock3, Microscope, Play, TerminalSquare } from "lucide-react";
import { EmptyState } from "#src/components/empty-state";
import { Panel } from "#src/components/panel";
import { formatDate, formatDuration, formatIdentifier } from "#src/lib/format";

interface ExperimentsPanelProps {
    experiments: Experiment[];
}

function experimentDuration(experiment: Experiment): string {
    if (!experiment.started_at) {
        return "—";
    }

    const end = experiment.finished_at ? new Date(experiment.finished_at).getTime() : Date.now();
    return formatDuration(end - new Date(experiment.started_at).getTime());
}

function ExperimentIcon({ status }: { status: Experiment["status"] }) {
    if (status === "running") {
        return <Play size={14} fill="currentColor" aria-hidden="true" />;
    }
    if (status === "succeeded") {
        return <CircleCheck size={14} aria-hidden="true" />;
    }
    if (["failed", "timed_out", "cancelled"].includes(status)) {
        return <CircleX size={14} aria-hidden="true" />;
    }
    return <Clock3 size={14} aria-hidden="true" />;
}

export function ExperimentsPanel({ experiments }: ExperimentsPanelProps) {
    const ordered = [...experiments].sort((left, right) => {
        if (left.status === "running") return -1;
        if (right.status === "running") return 1;
        return (right.started_at ?? "").localeCompare(left.started_at ?? "");
    });

    return (
        <Panel
            title="Experiments"
            eyebrow="Recent & running"
            icon={Microscope}
            action={<span className="count-badge">{experiments.length} runs</span>}
        >
            {ordered.length > 0 ? (
                <div className="experiment-list">
                    {ordered.slice(0, 8).map((experiment) => (
                        <article className="experiment" key={experiment.id}>
                            <span
                                className={`experiment__status experiment__status--${experiment.status}`}
                            >
                                <ExperimentIcon status={experiment.status} />
                            </span>
                            <div className="experiment__main">
                                <header>
                                    <strong>{experiment.hypothesis}</strong>
                                    <span className={`tag tag--${experiment.status}`}>
                                        {experiment.status.replace("_", " ")}
                                    </span>
                                </header>
                                <p>
                                    <TerminalSquare size={13} aria-hidden="true" />
                                    <code>{experiment.command}</code>
                                </p>
                                <footer>
                                    <span title={experiment.id}>
                                        {formatIdentifier(experiment.id)}
                                    </span>
                                    <span>Started {formatDate(experiment.started_at)}</span>
                                    <span>{experimentDuration(experiment)}</span>
                                    {experiment.exit_code !== undefined ? (
                                        <span>Exit {experiment.exit_code ?? "—"}</span>
                                    ) : null}
                                </footer>
                            </div>
                        </article>
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
