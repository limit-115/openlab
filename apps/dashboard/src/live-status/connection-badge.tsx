import { RadioIcon, WifiOffIcon } from "lucide-react";
import { Badge } from "#src/design-system/badge";
import {
    CONNECTION_BADGE_LABEL,
    CONNECTION_BADGE_TONE,
    SIGNAL_PULSE
} from "#src/live-status/connection-badge.const";
import { StreamState } from "#src/live-status/status-stream.const";
import type { LiveStatus } from "#src/live-status/status-stream.types";

interface ConnectionBadgeProps {
    stream: LiveStatus;
}

export function ConnectionBadge({ stream }: ConnectionBadgeProps) {
    return (
        <Badge
            variant={CONNECTION_BADGE_TONE[stream.state]}
            title={stream.protocolError}
            aria-live="polite"
        >
            {stream.state === StreamState.UNAVAILABLE ? (
                <WifiOffIcon aria-hidden="true" />
            ) : (
                <RadioIcon
                    className={stream.state === StreamState.LIVE ? SIGNAL_PULSE : undefined}
                    aria-hidden="true"
                />
            )}
            {CONNECTION_BADGE_LABEL[stream.state]}
        </Badge>
    );
}
