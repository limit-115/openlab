import type { AgentUsage } from "@lab/protocol/agent-activity/agent-activity.types";
import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { Badge } from "#src/design-system/badge";
import { Separator } from "#src/design-system/separator";
import { AgentTranscript } from "#src/team/agent-transcript";
import type { WatchedAgent } from "#src/team/agent-transcript.types";
import {
    AGENT_ARTIFACTS,
    AGENT_CARD,
    AGENT_CARD_HEADER,
    AGENT_EXECUTION,
    AGENT_STATUS_GROUP,
    HARNESS_LABEL,
    PHASE_LABEL,
    PHASE_TONE,
    RUN_STATUS_LABEL,
    RUN_STATUS_TONE
} from "#src/team/team-panel.const";

interface AgentCardProps {
    agent: WatchedAgent;
    task: InternalTask | undefined;
}

export function AgentCard({ agent, task }: AgentCardProps) {
    const { activity } = agent;
    const { execution } = activity;

    return (
        <article className={AGENT_CARD}>
            <header className={AGENT_CARD_HEADER}>
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold capitalize">{activity.role}</h3>
                    <p className={AGENT_EXECUTION}>
                        {HARNESS_LABEL[execution.harness]} · {execution.model} · {execution.effort}{" "}
                        effort
                    </p>
                </div>
                <div className={AGENT_STATUS_GROUP}>
                    <Badge variant={PHASE_TONE}>{PHASE_LABEL[activity.phase]}</Badge>
                    <Badge variant={RUN_STATUS_TONE[activity.status]}>
                        {RUN_STATUS_LABEL[activity.status]}
                    </Badge>
                </div>
            </header>

            {task === undefined ? null : <p className="text-sm">{task.objective}</p>}
            {activity.error === null ? null : (
                <p className="text-sm break-words text-destructive">{activity.error}</p>
            )}

            <Separator />
            <AgentTranscript entries={agent.transcript} />
            <Separator />

            <footer className="flex flex-col gap-1">
                <UsageLine usage={activity.usage} />
                <p className={AGENT_ARTIFACTS}>{activity.artifact_directory}</p>
            </footer>
        </article>
    );
}

function UsageLine({ usage }: { usage: AgentUsage | null }) {
    if (usage === null) {
        return null;
    }
    const parts = [
        usage.input_tokens === null ? undefined : `${usage.input_tokens} in`,
        usage.output_tokens === null ? undefined : `${usage.output_tokens} out`,
        usage.cached_input_tokens === null ? undefined : `${usage.cached_input_tokens} cached`
    ].filter((part) => part !== undefined);

    return parts.length === 0 ? null : (
        <p className="text-sm text-muted-foreground">{parts.join(" · ")} tokens</p>
    );
}
