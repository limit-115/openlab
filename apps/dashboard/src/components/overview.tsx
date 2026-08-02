import type { StatusSnapshot } from "@lab/protocol/status";
import { CircleDot, GitBranch, ListChecks, Microscope, Target } from "lucide-react";
import { Panel } from "#src/components/panel";
import { formatDate } from "#src/lib/format";

interface OverviewProps {
    snapshot: StatusSnapshot;
}

export function Overview({ snapshot }: OverviewProps) {
    const activeBranches = snapshot.branches.filter((branch) => branch.status === "active").length;
    const activeTasks = snapshot.tasks.filter((task) =>
        ["queued", "leased", "running"].includes(task.status)
    ).length;
    const supportedClaims = snapshot.claims.filter((claim) =>
        ["supported", "reproduced"].includes(claim.status)
    ).length;
    const runningExperiments = snapshot.experiments.filter(
        (experiment) => experiment.status === "running"
    ).length;

    return (
        <section className="overview" aria-labelledby="goal-heading">
            <Panel
                title="Mission goal"
                eyebrow="Active objective"
                icon={Target}
                className="goal-panel"
                action={
                    <span className="updated-at">
                        Updated {formatDate(snapshot.lab.updated_at)}
                    </span>
                }
            >
                <h1 id="goal-heading">{snapshot.lab.goal}</h1>
                {snapshot.lab.reason ? <p className="goal-reason">{snapshot.lab.reason}</p> : null}
            </Panel>

            <ul className="metric-grid" aria-label="Research metrics">
                <Metric
                    icon={GitBranch}
                    label="Active branches"
                    value={activeBranches}
                    total={snapshot.branches.length}
                    tone="cyan"
                />
                <Metric
                    icon={ListChecks}
                    label="Open tasks"
                    value={activeTasks}
                    total={snapshot.tasks.length}
                    tone="violet"
                />
                <Metric
                    icon={CircleDot}
                    label="Strong claims"
                    value={supportedClaims}
                    total={snapshot.claims.length}
                    tone="green"
                />
                <Metric
                    icon={Microscope}
                    label="Experiments live"
                    value={runningExperiments}
                    total={snapshot.experiments.length}
                    tone="amber"
                />
            </ul>
        </section>
    );
}

interface MetricProps {
    icon: typeof GitBranch;
    label: string;
    value: number;
    total: number;
    tone: string;
}

function Metric({ icon: Icon, label, value, total, tone }: MetricProps) {
    return (
        <li className={`metric metric--${tone}`}>
            <span className="metric__icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.8} />
            </span>
            <div>
                <span className="metric__label">{label}</span>
                <p className="metric__value">
                    {value}
                    <span> / {total}</span>
                </p>
            </div>
        </li>
    );
}
