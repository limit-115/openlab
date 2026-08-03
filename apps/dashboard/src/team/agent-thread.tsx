import type { AgentUsage } from "@lab/protocol/agent-activity/agent-activity.types";
import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { memo } from "react";
import { Separator } from "#src/design-system/separator";
import { agentExecutionLine } from "#src/team/agent-execution-line";
import { AgentStatusBadges } from "#src/team/agent-status-badges";
import { AgentTranscript } from "#src/team/agent-transcript";
import type { WatchedAgent } from "#src/team/agent-transcript.types";
import {
    AGENT_ARTIFACTS,
    AGENT_CARD_HEADER,
    AGENT_EXECUTION,
    AGENT_THREAD
} from "#src/team/team-panel.const";

interface AgentThreadProps {
    agent: WatchedAgent;
    task: InternalTask | undefined;
}

/**
 * The agent being read, in full: what it runs on, what it was given, and everything it has said.
 *
 * The store hands back the very same agent when a frame belonged to somebody else, so the thread
 * only redraws for the agent on screen rather than every time any of them says a word.
 */
export const AgentThread = memo(function AgentThread({ agent, task }: AgentThreadProps) {
    const { activity } = agent;
    const { execution } = activity;

    return (
        <article className={AGENT_THREAD}>
            <header className={AGENT_CARD_HEADER}>
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold capitalize">{activity.role}</h3>
                    <p className={AGENT_EXECUTION}>{agentExecutionLine(execution)}</p>
                </div>
                <AgentStatusBadges phase={activity.phase} status={activity.status} />
            </header>

            {task === undefined ? null : <p className="text-sm">{task.objective}</p>}
            {activity.error === null ? null : (
                <p className="text-sm wrap-anywhere text-destructive">{activity.error}</p>
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
});

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
