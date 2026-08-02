import { Radio, WifiOff } from "lucide-react";
import {
    CONNECTION_BADGE,
    CONNECTION_BADGE_LABEL,
    CONNECTION_BADGE_TONE,
    SIGNAL_PULSE
} from "#src/live-status/connection-badge.const";
import { StreamState } from "#src/live-status/status-stream.const";
import type { LiveStatus } from "#src/live-status/status-stream.types";
import { formatTime } from "#src/value-display/timestamp-display";

interface ConnectionBadgeProps {
    stream: LiveStatus;
}

export function ConnectionBadge({ stream }: ConnectionBadgeProps) {
    return (
        <div
            className={`${CONNECTION_BADGE} ${CONNECTION_BADGE_TONE[stream.state]}`}
            title={stream.protocolError}
            aria-live="polite"
        >
            {stream.state === StreamState.UNAVAILABLE ? (
                <WifiOff size={14} aria-hidden="true" />
            ) : (
                <Radio
                    size={14}
                    className={stream.state === StreamState.LIVE ? SIGNAL_PULSE : undefined}
                    aria-hidden="true"
                />
            )}
            <span>
                {CONNECTION_BADGE_LABEL[stream.state]}
                {stream.lastEventAt ? ` · ${formatTime(stream.lastEventAt.toISOString())}` : ""}
            </span>
        </div>
    );
}
