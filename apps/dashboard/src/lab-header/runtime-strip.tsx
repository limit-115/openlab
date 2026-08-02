import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { ActivityIcon } from "lucide-react";
import { cn } from "#src/design-system/class-names";
import { useElapsedTime } from "#src/lab-header/lab-uptime";
import {
    RUNTIME_STRIP,
    RUNTIME_STRIP_LABEL,
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
            <div className="flex items-center gap-2.5">
                <span
                    className={cn(STATE_DOT, STATE_DOT_TONE[snapshot.lab.state])}
                    aria-hidden="true"
                />
                <div className="flex flex-col">
                    <span className={RUNTIME_STRIP_LABEL}>State</span>
                    <strong className={RUNTIME_STRIP_VALUE}>{snapshot.lab.state}</strong>
                </div>
            </div>
            <div className="flex items-center gap-2.5">
                <ActivityIcon
                    className="size-4 flex-none text-muted-foreground"
                    aria-hidden="true"
                />
                <div className="flex flex-col">
                    <span className={RUNTIME_STRIP_LABEL}>Runtime · {activeAgents} active</span>
                    <strong className={RUNTIME_STRIP_VALUE}>{formatDuration(uptime)}</strong>
                </div>
            </div>
            <ConnectionBadge stream={stream} />
        </div>
    );
}
