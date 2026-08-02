import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { Activity } from "lucide-react";
import { useElapsedTime } from "#src/lab-header/lab-uptime";
import {
    RUNTIME_STRIP,
    RUNTIME_STRIP_ICON,
    RUNTIME_STRIP_ITEM,
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
            <div className={RUNTIME_STRIP_ITEM}>
                <span className={`${STATE_DOT} ${STATE_DOT_TONE[snapshot.lab.state]}`} />
                <div className="flex flex-col">
                    <span className={RUNTIME_STRIP_LABEL}>State</span>
                    <strong className={RUNTIME_STRIP_VALUE}>{snapshot.lab.state}</strong>
                </div>
            </div>
            <div className={RUNTIME_STRIP_ITEM}>
                <Activity size={15} className={RUNTIME_STRIP_ICON} aria-hidden="true" />
                <div className="flex flex-col">
                    <span className={RUNTIME_STRIP_LABEL}>Runtime · {activeAgents} active</span>
                    <strong className={RUNTIME_STRIP_VALUE}>{formatDuration(uptime)}</strong>
                </div>
            </div>
            <ConnectionBadge stream={stream} />
        </div>
    );
}
