import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { ActivityIcon } from "lucide-react";
import { cn } from "#src/design-system/class-names";
import { useElapsedTime } from "#src/lab-header/lab-uptime";
import {
    RUNTIME_AGENT_COUNT,
    RUNTIME_ICON,
    RUNTIME_READING,
    RUNTIME_STRIP,
    RUNTIME_STRIP_VALUE,
    STATE_DOT,
    STATE_DOT_TONE
} from "#src/lab-header/runtime-strip.const";
import { ConnectionBadge } from "#src/live-status/connection-badge";
import type { LiveStatus } from "#src/live-status/status-stream.types";
import { formatDuration } from "#src/value-display/duration-display";

interface RuntimeStripProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
}

export function RuntimeStrip({ snapshot, stream }: RuntimeStripProps) {
    const uptime = useElapsedTime(
        snapshot.lab.uptime_ms,
        snapshot.lab.updated_at,
        snapshot.lab.state === LabState.RUNNING
    );
    const activeAgents = snapshot.agents.filter(
        (agent) => agent.status === AgentStatus.WORKING
    ).length;

    return (
        <div className={RUNTIME_STRIP} role="status" aria-label="Lab runtime status">
            <span className={RUNTIME_READING}>
                <span
                    className={cn(STATE_DOT, STATE_DOT_TONE[snapshot.lab.state])}
                    aria-hidden="true"
                />
                <strong className={RUNTIME_STRIP_VALUE}>{snapshot.lab.state}</strong>
            </span>
            <span className={RUNTIME_READING}>
                <ActivityIcon className={RUNTIME_ICON} aria-hidden="true" />
                <strong className={RUNTIME_STRIP_VALUE}>{formatDuration(uptime)}</strong>
                <span className={RUNTIME_AGENT_COUNT}>· {activeAgents} active</span>
            </span>
            <ConnectionBadge stream={stream} />
        </div>
    );
}
