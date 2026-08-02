import { AgentStatus, LabState } from "@lab/protocol/constants";
import type { StatusSnapshot } from "@lab/protocol/status";
import { Activity, FlaskConical, Radio, WifiOff } from "lucide-react";
import { StreamState, type StreamState as StreamStateValue } from "#src/api/stream-constants";
import type { LiveStatus } from "#src/api/use-live-status";
import { formatDuration, formatIdentifier, formatTime } from "#src/lib/format";
import { useElapsedTime } from "#src/lib/use-elapsed-time";

interface DashboardHeaderProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
}

const streamLabels: Record<StreamStateValue, string> = {
    [StreamState.CONNECTING]: "Connecting",
    [StreamState.LIVE]: "Live",
    [StreamState.RECONNECTING]: "Reconnecting",
    [StreamState.UNAVAILABLE]: "Offline"
} as const;

export function DashboardHeader({ snapshot, stream }: DashboardHeaderProps) {
    const uptime = useElapsedTime(
        snapshot.lab.uptime_ms,
        snapshot.lab.updated_at,
        snapshot.lab.state === LabState.RUNNING
    );
    const activeAgents = snapshot.agents.filter(
        (agent) => agent.status === AgentStatus.WORKING
    ).length;

    return (
        <header className="topbar">
            <div className="brand">
                <span className="brand__mark" aria-hidden="true">
                    <FlaskConical size={21} strokeWidth={1.8} />
                </span>
                <div>
                    <p className="brand__name">Research Lab</p>
                    <p className="brand__id" title={snapshot.lab.id}>
                        {formatIdentifier(snapshot.lab.id)}
                    </p>
                </div>
            </div>

            <nav className="section-nav" aria-label="Dashboard sections">
                <a href="#frontier">Frontier</a>
                <a href="#operations">Operations</a>
                <a href="#evidence">Evidence</a>
                <a href="#events">Events</a>
            </nav>

            <div className="runtime-strip" role="status" aria-label="Lab runtime status">
                <div className="runtime-strip__item">
                    <span className={`state-dot state-dot--${snapshot.lab.state.toLowerCase()}`} />
                    <div>
                        <span>State</span>
                        <strong>{snapshot.lab.state}</strong>
                    </div>
                </div>
                <div className="runtime-strip__item runtime-strip__item--wide">
                    <Activity size={15} aria-hidden="true" />
                    <div>
                        <span>Runtime · {activeAgents} active</span>
                        <strong>{formatDuration(uptime)}</strong>
                    </div>
                </div>
                <div
                    className={`connection connection--${stream.state}`}
                    title={stream.protocolError}
                    aria-live="polite"
                >
                    {stream.state === StreamState.UNAVAILABLE ? (
                        <WifiOff size={14} aria-hidden="true" />
                    ) : (
                        <Radio size={14} aria-hidden="true" />
                    )}
                    <span>
                        {streamLabels[stream.state]}
                        {stream.lastEventAt
                            ? ` · ${formatTime(stream.lastEventAt.toISOString())}`
                            : ""}
                    </span>
                </div>
            </div>
        </header>
    );
}
